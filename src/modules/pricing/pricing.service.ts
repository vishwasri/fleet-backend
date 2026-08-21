import { Injectable, NotFoundException } from '@nestjs/common';
import { DepositType, LateReturnRateType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CalculateBookingPriceDto } from './dto/calculate-price.dto';
import Decimal from 'decimal.js';

export interface PricingBreakdown {
  dailyRate: Prisma.Decimal;
  numberOfDays: number;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxRatePercent: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  rentalTotal: Prisma.Decimal;
  totalAmountPayable: Prisma.Decimal;
  lineItems: {
    label: string;
    amount: number;
    type: 'CHARGE' | 'DISCOUNT' | 'TAX' | 'DEPOSIT';
  }[];
}

@Injectable()
export class PricingService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  private calculateDays(start: Date, end: Date): number {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }

  async calculateBookingPricing(
    orgId: string,
    dto: CalculateBookingPriceDto,
  ): Promise<PricingBreakdown> {
    const [vehicle, settings] = await Promise.all([
      this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, organizationId: orgId },
      }),
      this.settingsService.getSettings(orgId),
    ]);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in organization');
    }

    const numberOfDays = this.calculateDays(dto.pickupDateTime, dto.returnDateTime);
    const rateVal = dto.customDailyRate !== undefined ? dto.customDailyRate : Number(vehicle.dailyRate);
    const dailyRate = new Decimal(rateVal);
    const subtotal = dailyRate.mul(numberOfDays);
    const discount = new Decimal(dto.discountAmount || 0);

    const netBeforeTax = Decimal.max(0, subtotal.minus(discount));

    // Tax calculation
    const taxRate = new Decimal(settings.defaultTaxRate ? settings.defaultTaxRate.toString() : '0');
    let taxAmount = new Decimal(0);
    if (taxRate.greaterThan(0)) {
      if (settings.taxInclusive) {
        // Net is inclusive of tax: Tax = Net - (Net / (1 + Rate/100))
        const divisor = new Decimal(1).plus(taxRate.div(100));
        taxAmount = netBeforeTax.minus(netBeforeTax.div(divisor));
      } else {
        taxAmount = netBeforeTax.mul(taxRate.div(100));
      }
    }

    const rentalTotal = settings.taxInclusive ? netBeforeTax : netBeforeTax.plus(taxAmount);

    // Deposit calculation
    let deposit = new Decimal(0);
    if (dto.customDepositAmount !== undefined) {
      deposit = new Decimal(dto.customDepositAmount);
    } else if (settings.defaultDepositType === DepositType.PERCENTAGE) {
      const pct = new Decimal(settings.defaultDepositValue.toString());
      deposit = rentalTotal.mul(pct.div(100));
    } else if (settings.defaultDepositType === DepositType.FIXED) {
      deposit = new Decimal(settings.defaultDepositValue.toString());
    }

    const totalPayable = rentalTotal.plus(deposit);

    const lineItems: PricingBreakdown['lineItems'] = [
      {
        label: `Daily Rental (${numberOfDays} day${numberOfDays > 1 ? 's' : ''} @ ${dailyRate.toFixed(2)})`,
        amount: Number(subtotal.toFixed(2)),
        type: 'CHARGE',
      },
    ];

    if (discount.greaterThan(0)) {
      lineItems.push({
        label: 'Discount',
        amount: Number(discount.toFixed(2)),
        type: 'DISCOUNT',
      });
    }

    if (taxAmount.greaterThan(0)) {
      lineItems.push({
        label: `Tax (${taxRate.toFixed(2)}%${settings.taxInclusive ? ' incl.' : ''})`,
        amount: Number(taxAmount.toFixed(2)),
        type: 'TAX',
      });
    }

    if (deposit.greaterThan(0)) {
      lineItems.push({
        label: 'Security Deposit (Refundable)',
        amount: Number(deposit.toFixed(2)),
        type: 'DEPOSIT',
      });
    }

    return {
      dailyRate: new Prisma.Decimal(dailyRate.toFixed(2)),
      numberOfDays,
      subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
      discountAmount: new Prisma.Decimal(discount.toFixed(2)),
      taxRatePercent: new Prisma.Decimal(taxRate.toFixed(2)),
      taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
      depositAmount: new Prisma.Decimal(deposit.toFixed(2)),
      rentalTotal: new Prisma.Decimal(rentalTotal.toFixed(2)),
      totalAmountPayable: new Prisma.Decimal(totalPayable.toFixed(2)),
      lineItems,
    };
  }

  calculateLateReturnFee(
    settings: {
      lateReturnGracePeriodMinutes?: number;
      defaultLateReturnRateType?: LateReturnRateType;
      defaultLateReturnRate?: Prisma.Decimal | number | null;
    },
    scheduledReturn: Date,
    actualReturn: Date,
  ): { minutesLate: number; fee: Prisma.Decimal } {
    const sched = new Date(scheduledReturn).getTime();
    const actual = new Date(actualReturn).getTime();
    const graceMs = (settings.lateReturnGracePeriodMinutes || 60) * 60 * 1000;

    if (actual <= sched + graceMs) {
      return { minutesLate: 0, fee: new Prisma.Decimal(0) };
    }

    const diffMinutes = Math.ceil((actual - sched) / (1000 * 60));
    const rateVal = new Decimal(settings.defaultLateReturnRate ? settings.defaultLateReturnRate.toString() : '25');

    let fee = new Decimal(0);
    if (settings.defaultLateReturnRateType === LateReturnRateType.HOURLY) {
      const hoursLate = Math.ceil(diffMinutes / 60);
      fee = rateVal.mul(hoursLate);
    } else {
      const daysLate = Math.ceil(diffMinutes / (60 * 24));
      fee = rateVal.mul(daysLate);
    }

    return {
      minutesLate: diffMinutes,
      fee: new Prisma.Decimal(fee.toFixed(2)),
    };
  }

  calculateExtraMileageFee(
    settings: {
      defaultMileageLimitPerDay?: number | null;
      defaultExtraMileageRate?: Prisma.Decimal | number | null;
    },
    numberOfDays: number,
    distanceDriven: number,
  ): { excessMileage: number; fee: Prisma.Decimal } {
    if (!settings.defaultMileageLimitPerDay || !settings.defaultExtraMileageRate) {
      return { excessMileage: 0, fee: new Prisma.Decimal(0) };
    }

    const maxAllowed = settings.defaultMileageLimitPerDay * numberOfDays;
    const excess = distanceDriven - maxAllowed;

    if (excess <= 0) {
      return { excessMileage: 0, fee: new Prisma.Decimal(0) };
    }

    const rate = new Decimal(settings.defaultExtraMileageRate.toString());
    const fee = rate.mul(excess);

    return {
      excessMileage: excess,
      fee: new Prisma.Decimal(fee.toFixed(2)),
    };
  }
}
