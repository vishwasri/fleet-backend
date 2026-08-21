import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus, PartnerRentalStatus, MaintenanceStatus, VehicleBlockReason } from '@prisma/client';

import { VehicleDocumentsService } from '../vehicle-documents/vehicle-documents.service';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;
  let docsMock: any;

  beforeEach(async () => {
    prisma = {
      booking: { findMany: jest.fn() },
      partnerRental: { findMany: jest.fn() },
      maintenanceRecord: { findMany: jest.fn() },
      vehicleBlock: { findMany: jest.fn() },
      vehicle: { findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-1' }), findMany: jest.fn() },
    };

    docsMock = {
      assertVehicleCompliant: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: VehicleDocumentsService, useValue: docsMock },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  describe('validateDateRange', () => {
    it('should throw BadRequestException if return is before pickup', () => {
      const start = new Date('2026-09-05T10:00:00Z');
      const end = new Date('2026-09-01T10:00:00Z');
      expect(() => service.validateDateRange(start, end)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if dates are identical', () => {
      const date = new Date('2026-09-01T10:00:00Z');
      expect(() => service.validateDateRange(date, date)).toThrow(BadRequestException);
    });
  });

  describe('findConflicts', () => {
    const vehicleId = 'v-123';
    const pickup = new Date('2026-09-01T10:00:00Z');
    const returnDate = new Date('2026-09-05T10:00:00Z');

    it('should return empty conflicts when all resources are free', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.partnerRental.findMany.mockResolvedValue([]);
      prisma.maintenanceRecord.findMany.mockResolvedValue([]);
      prisma.vehicleBlock.findMany.mockResolvedValue([]);

      const conflicts = await service.findConflicts(prisma, vehicleId, pickup, returnDate);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect overlap with a direct booking', async () => {
      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'b-1',
          bookingNumber: 'FLT-001',
          bookingStatus: BookingStatus.CONFIRMED,
          pickupDateTime: new Date('2026-09-02T10:00:00Z'),
          returnDateTime: new Date('2026-09-06T10:00:00Z'),
        },
      ]);
      prisma.partnerRental.findMany.mockResolvedValue([]);
      prisma.maintenanceRecord.findMany.mockResolvedValue([]);
      prisma.vehicleBlock.findMany.mockResolvedValue([]);

      const conflicts = await service.findConflicts(prisma, vehicleId, pickup, returnDate);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('DIRECT_BOOKING');
      expect(conflicts[0].id).toBe('b-1');
    });

    it('should detect overlap with a partner rental', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.partnerRental.findMany.mockResolvedValue([
        {
          id: 'pr-1',
          status: PartnerRentalStatus.ACTIVE,
          handoverDateTime: new Date('2026-08-30T10:00:00Z'),
          returnDateTime: new Date('2026-09-03T10:00:00Z'),
        },
      ]);
      prisma.maintenanceRecord.findMany.mockResolvedValue([]);
      prisma.vehicleBlock.findMany.mockResolvedValue([]);

      const conflicts = await service.findConflicts(prisma, vehicleId, pickup, returnDate);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('PARTNER_RENTAL');
    });

    it('should detect overlap with a vehicle block', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.partnerRental.findMany.mockResolvedValue([]);
      prisma.maintenanceRecord.findMany.mockResolvedValue([]);
      prisma.vehicleBlock.findMany.mockResolvedValue([
        {
          id: 'vb-1',
          reason: VehicleBlockReason.MAINTENANCE,
          startDateTime: new Date('2026-09-01T00:00:00Z'),
          endDateTime: new Date('2026-09-02T00:00:00Z'),
          notes: 'Shop repair',
        },
      ]);

      const conflicts = await service.findConflicts(prisma, vehicleId, pickup, returnDate);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('VEHICLE_BLOCK');
    });
  });

  describe('assertVehicleAvailable', () => {
    it('should throw ConflictException if any overlap exists', async () => {
      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'b-99',
          bookingNumber: 'FLT-999',
          bookingStatus: BookingStatus.CONFIRMED,
          pickupDateTime: new Date('2026-09-01T10:00:00Z'),
          returnDateTime: new Date('2026-09-05T10:00:00Z'),
        },
      ]);
      prisma.partnerRental.findMany.mockResolvedValue([]);
      prisma.maintenanceRecord.findMany.mockResolvedValue([]);
      prisma.vehicleBlock.findMany.mockResolvedValue([]);

      await expect(
        service.assertVehicleAvailable(
          prisma,
          'v-1',
          new Date('2026-09-01T10:00:00Z'),
          new Date('2026-09-05T10:00:00Z'),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
