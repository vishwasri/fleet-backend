export class BookingNumberUtil {
  static generateDirectBookingNumber(prefix = 'FLT'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${timestamp}-${random}`;
  }

  static generatePartnerRentalNumber(prefix = 'PRT'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${timestamp}-${random}`;
  }
}
