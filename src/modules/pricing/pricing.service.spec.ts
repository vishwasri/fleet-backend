import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { DepositType, LateReturnRateType, Prisma } from '@prisma/client';

describe('PricingService', () => {
  let service: PricingService;
  let prismaMock: any;
  let settingsMock: any;

  beforeEach(async () => {
    prismaMock = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'v-123',
          dailyRate: new Prisma.Decimal(100.0),
        }),
      },
    };

    settingsMock = {
      getSettings: jest.fn().mockResolvedValue({
        defaultTaxRate: new Prisma.Decimal(10.0),
        taxInclusive: false,
        defaultDepositType: DepositType.FIXED,
        defaultDepositValue: new Prisma.Decimal(200.0),
        defaultMileageLimitPerDay: 150,
        defaultExtraMileageRate: new Prisma.Decimal(0.5),
        lateReturnGracePeriodMinutes: 60,
        defaultLateReturnRateType: LateReturnRateType.HOURLY,
        defaultLateReturnRate: new Prisma.Decimal(25.0),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SettingsService, useValue: settingsMock },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should calculate correct price breakdown with tax exclusive and fixed deposit', async () => {
    const result = await service.calculateBookingPricing('org-1', {
      vehicleId: 'v-123',
      pickupDateTime: new Date('2026-09-01T10:00:00Z'),
      returnDateTime: new Date('2026-09-04T10:00:00Z'), // 3 days
      discountAmount: 20.0,
    });

    expect(Number(result.subtotal)).toBe(300.0); // 3 * 100
    expect(Number(result.discountAmount)).toBe(20.0);
    // Net before tax = 280. Tax = 28.0 (10%). Rental total = 308.0
    expect(Number(result.taxAmount)).toBe(28.0);
    expect(Number(result.rentalTotal)).toBe(308.0);
    expect(Number(result.depositAmount)).toBe(200.0);
    expect(Number(result.totalAmountPayable)).toBe(508.0);
    expect(result.lineItems.length).toBe(4);
  });

  it('should calculate late return fee when return exceeds grace period', () => {
    const scheduled = new Date('2026-09-04T10:00:00Z');
    const actual = new Date('2026-09-04T12:30:00Z'); // 2.5 hours late = 3 billable hours

    const result = service.calculateLateReturnFee(
      {
        lateReturnGracePeriodMinutes: 60,
        defaultLateReturnRateType: LateReturnRateType.HOURLY,
        defaultLateReturnRate: new Prisma.Decimal(25.0),
      },
      scheduled,
      actual,
    );

    expect(result.minutesLate).toBe(150);
    expect(Number(result.fee)).toBe(75.0); // 3 hours * $25
  });

  it('should waive late return fee when within grace period', () => {
    const scheduled = new Date('2026-09-04T10:00:00Z');
    const actual = new Date('2026-09-04T10:45:00Z'); // 45 mins late (grace = 60)

    const result = service.calculateLateReturnFee(
      {
        lateReturnGracePeriodMinutes: 60,
        defaultLateReturnRateType: LateReturnRateType.HOURLY,
        defaultLateReturnRate: new Prisma.Decimal(25.0),
      },
      scheduled,
      actual,
    );

    expect(Number(result.fee)).toBe(0);
  });

  it('should calculate extra mileage fee accurately', () => {
    const result = service.calculateExtraMileageFee(
      {
        defaultMileageLimitPerDay: 100,
        defaultExtraMileageRate: new Prisma.Decimal(0.4),
      },
      3, // 3 days => 300 allowed
      380, // 80 miles over limit
    );

    expect(result.excessMileage).toBe(80);
    expect(Number(result.fee)).toBe(32.0); // 80 * 0.40
  });
});
