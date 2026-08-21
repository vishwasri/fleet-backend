import { Injectable } from '@nestjs/common';
import { BookingStatus, PartnerRentalStatus, TransactionCategory, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getRevenueComparison(orgId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      organizationId: orgId,
    };
    if (startDate || endDate) {
      where.transactionDate = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
    });

    let directRentalRevenue = new Decimal(0);
    let partnerRentalRevenue = new Decimal(0);
    let otherIncome = new Decimal(0);
    let expenses = new Decimal(0);

    for (const tx of transactions) {
      const amt = new Decimal(tx.amount.toString());
      if (tx.type === TransactionType.INCOME) {
        if (tx.category === TransactionCategory.DIRECT_RENTAL) {
          directRentalRevenue = directRentalRevenue.plus(amt);
        } else if (tx.category === TransactionCategory.PARTNER_RENTAL) {
          partnerRentalRevenue = partnerRentalRevenue.plus(amt);
        } else {
          otherIncome = otherIncome.plus(amt);
        }
      } else {
        expenses = expenses.plus(amt);
      }
    }

    const totalIncome = directRentalRevenue.plus(partnerRentalRevenue).plus(otherIncome);

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      directRentalRevenue: Number(directRentalRevenue.toFixed(2)),
      partnerRentalRevenue: Number(partnerRentalRevenue.toFixed(2)),
      otherIncome: Number(otherIncome.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(expenses.toFixed(2)),
      netProfit: Number(totalIncome.minus(expenses).toFixed(2)),
      directVsPartnerRatio: partnerRentalRevenue.greaterThan(0)
        ? Number(directRentalRevenue.div(partnerRentalRevenue).toFixed(2))
        : null,
    };
  }

  async getFleetUtilization(orgId: string, startDate?: Date, endDate?: Date) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const vehicles = await this.prisma.vehicle.findMany({
      where: { organizationId: orgId },
      select: { id: true, make: true, model: true, registrationNumber: true, category: true },
    });

    const [directBookings, partnerRentals] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          organizationId: orgId,
          bookingStatus: { not: BookingStatus.CANCELLED },
          pickupDateTime: { gte: start },
          returnDateTime: { lte: end },
        },
        select: { vehicleId: true, numberOfDays: true, totalAmount: true },
      }),
      this.prisma.partnerRental.findMany({
        where: {
          supplyingOrganizationId: orgId,
          status: { not: PartnerRentalStatus.CANCELLED },
          handoverDateTime: { gte: start },
          returnDateTime: { lte: end },
        },
        select: { vehicleId: true, numberOfDays: true, totalAmount: true },
      }),
    ]);

    const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const utilizationByVehicle = vehicles.map((v) => {
      const vBookings = directBookings.filter((b) => b.vehicleId === v.id);
      const vPartnerRentals = partnerRentals.filter((pr) => pr.vehicleId === v.id);

      const directDays = vBookings.reduce((sum, b) => sum + b.numberOfDays, 0);
      const partnerDays = vPartnerRentals.reduce((sum, pr) => sum + pr.numberOfDays, 0);
      const totalRentedDays = directDays + partnerDays;

      const directRev = vBookings.reduce((sum, b) => sum.plus(new Decimal(b.totalAmount.toString())), new Decimal(0));
      const partnerRev = vPartnerRentals.reduce((sum, pr) => sum.plus(new Decimal(pr.totalAmount.toString())), new Decimal(0));

      return {
        vehicleId: v.id,
        make: v.make,
        model: v.model,
        registrationNumber: v.registrationNumber,
        category: v.category,
        directRentalDays: directDays,
        partnerRentalDays: partnerDays,
        totalRentedDays,
        utilizationPercent: Number(((totalRentedDays / daysInPeriod) * 100).toFixed(1)),
        directRevenue: Number(directRev.toFixed(2)),
        partnerRevenue: Number(partnerRev.toFixed(2)),
        totalRevenue: Number(directRev.plus(partnerRev).toFixed(2)),
      };
    });

    const totalFleetDays = vehicles.length * daysInPeriod;
    const totalFleetRentedDays = utilizationByVehicle.reduce((sum, item) => sum + item.totalRentedDays, 0);

    return {
      period: { startDate: start, endDate: end, daysInPeriod },
      fleetSummary: {
        totalVehicles: vehicles.length,
        overallFleetUtilizationPercent: totalFleetDays > 0
          ? Number(((totalFleetRentedDays / totalFleetDays) * 100).toFixed(1))
          : 0,
        totalFleetRentedDays,
      },
      vehicles: utilizationByVehicle,
    };
  }

  async getPartnerSettlements(orgId: string) {
    const [suppliedRentals, requestedRentals] = await Promise.all([
      this.prisma.partnerRental.findMany({
        where: { supplyingOrganizationId: orgId },
        include: {
          requestingOrg: { select: { id: true, displayName: true, email: true, phone: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partnerRental.findMany({
        where: { requestingOrganizationId: orgId },
        include: {
          supplyingOrg: { select: { id: true, displayName: true, email: true, phone: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let totalReceivables = new Decimal(0);
    let totalPayables = new Decimal(0);

    const receivables = suppliedRentals.map((r) => {
      const bal = new Decimal(r.balanceAmount.toString());
      totalReceivables = totalReceivables.plus(bal);
      return {
        partnerRentalId: r.id,
        partner: r.requestingOrg,
        vehicle: `${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.registrationNumber})`,
        totalAmount: Number(r.totalAmount),
        paidAmount: Number(r.paidAmount),
        balanceAmount: Number(r.balanceAmount),
        paymentStatus: r.paymentStatus,
        status: r.status,
      };
    });

    const payables = requestedRentals.map((r) => {
      const bal = new Decimal(r.balanceAmount.toString());
      totalPayables = totalPayables.plus(bal);
      return {
        partnerRentalId: r.id,
        partner: r.supplyingOrg,
        vehicle: `${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.registrationNumber})`,
        totalAmount: Number(r.totalAmount),
        paidAmount: Number(r.paidAmount),
        balanceAmount: Number(r.balanceAmount),
        paymentStatus: r.paymentStatus,
        status: r.status,
      };
    });

    return {
      summary: {
        totalReceivableFromPartners: Number(totalReceivables.toFixed(2)),
        totalPayableToPartners: Number(totalPayables.toFixed(2)),
        netPartnerBalance: Number(totalReceivables.minus(totalPayables).toFixed(2)),
      },
      receivables,
      payables,
    };
  }

  async getMarketplacePerformanceStub(orgId: string) {
    return {
      message: 'Version 2 Marketplace Reporting Foundation',
      metrics: {
        marketplaceBookings: 0,
        marketplaceGrossRevenue: 0.0,
        platformFees: 0.0,
        netPayouts: 0.0,
        conversionRatePercent: 0.0,
      },
      note: 'Available when Version 2 public marketplace is unlocked',
    };
  }
}
