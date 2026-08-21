import { MoneyUtil } from './money.util';

describe('MoneyUtil', () => {
  it('should accurately calculate rental pricing without floating point errors', () => {
    const result = MoneyUtil.calculateRentalPricing(120.5, 4, 25.0, 200.0);

    // subtotal = 120.50 * 4 = 482.00
    // total = 482.00 - 25.00 + 200.00 = 657.00
    expect(result.dailyRate.toFixed(2)).toBe('120.50');
    expect(result.numberOfDays).toBe(4);
    expect(result.subtotal.toFixed(2)).toBe('482.00');
    expect(result.discountAmount.toFixed(2)).toBe('25.00');
    expect(result.depositAmount.toFixed(2)).toBe('200.00');
    expect(result.totalAmount.toFixed(2)).toBe('657.00');
    expect(result.balanceAmount.toFixed(2)).toBe('657.00');
    expect(result.paidAmount.toFixed(2)).toBe('0.00');
  });

  it('should round correctly to decimal places', () => {
    const rounded = MoneyUtil.round(19.995, 2);
    expect(rounded.toFixed(2)).toBe('20.00');

    const rounded2 = MoneyUtil.round('19.994', 2);
    expect(rounded2.toFixed(2)).toBe('19.99');
  });
});
