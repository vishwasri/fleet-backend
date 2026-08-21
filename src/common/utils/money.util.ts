import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

export class MoneyUtil {
  static toDecimal(val: number | string | Decimal | Prisma.Decimal): Prisma.Decimal {
    if (val === null || val === undefined) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(val.toString());
  }

  static round(val: number | string | Decimal | Prisma.Decimal, places = 2): Prisma.Decimal {
    const d = new Decimal(val.toString()).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
    return new Prisma.Decimal(d.toString());
  }

  static calculateRentalPricing(dailyRate: number | string | Prisma.Decimal, numberOfDays: number, discount = 0, deposit = 0) {
    const rate = new Decimal(dailyRate.toString());
    const days = new Decimal(numberOfDays);
    const subtotal = rate.mul(days);
    const disc = new Decimal(discount.toString());
    const dep = new Decimal(deposit.toString());
    
    const total = subtotal.minus(disc).plus(dep);
    
    return {
      dailyRate: new Prisma.Decimal(rate.toFixed(2)),
      numberOfDays,
      subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
      discountAmount: new Prisma.Decimal(disc.toFixed(2)),
      depositAmount: new Prisma.Decimal(dep.toFixed(2)),
      totalAmount: new Prisma.Decimal(total.toFixed(2)),
      paidAmount: new Prisma.Decimal(0),
      balanceAmount: new Prisma.Decimal(total.toFixed(2)),
    };
  }
}
