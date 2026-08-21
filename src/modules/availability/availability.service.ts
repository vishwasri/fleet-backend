import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, BookingStatus, PartnerRentalStatus, MaintenanceStatus, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckVehicleAvailabilityDto, SearchAvailableVehiclesDto } from './dto/check-availability.dto';

import { VehicleDocumentsService } from '../vehicle-documents/vehicle-documents.service';

export interface VehicleConflictDetail {
  type: 'DIRECT_BOOKING' | 'PARTNER_RENTAL' | 'MAINTENANCE' | 'VEHICLE_BLOCK';
  id: string;
  startDate: Date;
  endDate: Date;
  description: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private prisma: PrismaService,
    private documentsService: VehicleDocumentsService,
  ) {}

  /**
   * Validates date range logic
   */
  validateDateRange(pickup: Date, returnDate: Date) {
    const start = new Date(pickup);
    const end = new Date(returnDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }

    if (start >= end) {
      throw new BadRequestException('Return date and time must be strictly after pickup date and time');
    }
  }

  /**
   * Central collision detection query inside an optional Prisma transaction client.
   * Two date ranges [A, B] and [C, D] overlap if (A < D) and (B > C).
   */
  async findConflicts(
    prismaClient: PrismaService | Prisma.TransactionClient,
    vehicleId: string,
    pickupDateTime: Date,
    returnDateTime: Date,
    options?: {
      excludeBookingId?: string;
      excludePartnerRentalId?: string;
      excludeMaintenanceId?: string;
      excludeBlockId?: string;
    },
  ): Promise<VehicleConflictDetail[]> {
    this.validateDateRange(pickupDateTime, returnDateTime);

    const conflicts: VehicleConflictDetail[] = [];

    // 1. Direct Bookings overlap
    const activeBookingStatuses: BookingStatus[] = [
      BookingStatus.PENDING_APPROVAL,
      BookingStatus.CONFIRMED,
      BookingStatus.PICKED_UP,
      BookingStatus.ACTIVE,
    ];

    const overlappingBookings = await prismaClient.booking.findMany({
      where: {
        vehicleId,
        id: options?.excludeBookingId ? { not: options.excludeBookingId } : undefined,
        bookingStatus: { in: activeBookingStatuses },
        pickupDateTime: { lt: returnDateTime },
        returnDateTime: { gt: pickupDateTime },
      },
    });

    for (const b of overlappingBookings) {
      conflicts.push({
        type: 'DIRECT_BOOKING',
        id: b.id,
        startDate: b.pickupDateTime,
        endDate: b.returnDateTime,
        description: `Direct Booking #${b.bookingNumber} (${b.bookingStatus})`,
      });
    }

    // 2. Partner Rentals overlap
    const activePartnerStatuses: PartnerRentalStatus[] = [
      PartnerRentalStatus.ACCEPTED,
      PartnerRentalStatus.HANDED_OVER,
      PartnerRentalStatus.ACTIVE,
    ];

    const overlappingPartnerRentals = await prismaClient.partnerRental.findMany({
      where: {
        vehicleId,
        id: options?.excludePartnerRentalId ? { not: options.excludePartnerRentalId } : undefined,
        status: { in: activePartnerStatuses },
        handoverDateTime: { lt: returnDateTime },
        returnDateTime: { gt: pickupDateTime },
      },
    });

    for (const pr of overlappingPartnerRentals) {
      conflicts.push({
        type: 'PARTNER_RENTAL',
        id: pr.id,
        startDate: pr.handoverDateTime,
        endDate: pr.returnDateTime,
        description: `B2B Partner Rental (${pr.status})`,
      });
    }

    // 3. Maintenance Records overlap
    const activeMaintenanceStatuses: MaintenanceStatus[] = [
      MaintenanceStatus.SCHEDULED,
      MaintenanceStatus.IN_PROGRESS,
    ];

    const overlappingMaintenance = await prismaClient.maintenanceRecord.findMany({
      where: {
        vehicleId,
        id: options?.excludeMaintenanceId ? { not: options.excludeMaintenanceId } : undefined,
        status: { in: activeMaintenanceStatuses },
        scheduledDate: {
          gte: new Date(new Date(pickupDateTime).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(returnDateTime).setHours(23, 59, 59, 999)),
        },
      },
    });

    for (const m of overlappingMaintenance) {
      conflicts.push({
        type: 'MAINTENANCE',
        id: m.id,
        startDate: m.scheduledDate,
        endDate: m.completedDate || m.scheduledDate,
        description: `Maintenance: ${m.title} (${m.status})`,
      });
    }

    // 4. Vehicle Blocks (Owner use, Maintenance, etc.)
    const overlappingBlocks = await prismaClient.vehicleBlock.findMany({
      where: {
        vehicleId,
        id: options?.excludeBlockId ? { not: options.excludeBlockId } : undefined,
        startDateTime: { lt: returnDateTime },
        endDateTime: { gt: pickupDateTime },
      },
    });

    for (const vb of overlappingBlocks) {
      conflicts.push({
        type: 'VEHICLE_BLOCK',
        id: vb.id,
        startDate: vb.startDateTime,
        endDate: vb.endDateTime,
        description: `Vehicle Block (${vb.reason}): ${vb.notes || 'No notes'}`,
      });
    }

    return conflicts;
  }

  /**
   * Asserts availability and throws ConflictException if any overlap is found.
   * Essential for transactional operations.
   */
  async assertVehicleAvailable(
    prismaClient: PrismaService | Prisma.TransactionClient,
    vehicleId: string,
    pickupDateTime: Date,
    returnDateTime: Date,
    options?: {
      excludeBookingId?: string;
      excludePartnerRentalId?: string;
      excludeMaintenanceId?: string;
      excludeBlockId?: string;
      skipComplianceCheck?: boolean;
    },
  ): Promise<void> {
    if (!options?.skipComplianceCheck) {
      const vehicle = await prismaClient.vehicle.findUnique({
        where: { id: vehicleId },
        select: { organizationId: true },
      });
      if (vehicle) {
        await this.documentsService.assertVehicleCompliant(vehicle.organizationId, vehicleId);
      }
    }

    const conflicts = await this.findConflicts(
      prismaClient,
      vehicleId,
      pickupDateTime,
      returnDateTime,
      options,
    );

    if (conflicts.length > 0) {
      const summary = conflicts.map((c) => c.description).join(', ');
      throw new ConflictException(`Vehicle is not available for requested period. Conflict: ${summary}`);
    }
  }

  /**
   * Check single vehicle availability
   */
  async checkVehicleAvailability(dto: CheckVehicleAvailabilityDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    if (vehicle.status === VehicleStatus.INACTIVE) {
      return {
        available: false,
        reason: 'Vehicle is currently inactive',
        conflicts: [],
      };
    }

    const conflicts = await this.findConflicts(
      this.prisma,
      dto.vehicleId,
      dto.pickupDateTime,
      dto.returnDateTime,
      {
        excludeBookingId: dto.excludeBookingId,
        excludePartnerRentalId: dto.excludePartnerRentalId,
      },
    );

    return {
      available: conflicts.length === 0,
      vehicleId: dto.vehicleId,
      conflicts,
    };
  }

  /**
   * Search all available vehicles in organization for date range
   */
  async searchAvailableVehicles(orgId: string, dto: SearchAvailableVehiclesDto) {
    this.validateDateRange(dto.pickupDateTime, dto.returnDateTime);

    const whereClause: Prisma.VehicleWhereInput = {
      organizationId: orgId,
      status: { not: VehicleStatus.INACTIVE },
      category: dto.category ? dto.category : undefined,
      dailyRate: dto.maxDailyRate ? { lte: dto.maxDailyRate } : undefined,
    };

    const allVehicles = await this.prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { dailyRate: 'asc' },
    });

    const availableVehicles = [];

    for (const vehicle of allVehicles) {
      const conflicts = await this.findConflicts(
        this.prisma,
        vehicle.id,
        dto.pickupDateTime,
        dto.returnDateTime,
      );

      if (conflicts.length === 0) {
        availableVehicles.push(vehicle);
      }
    }

    return availableVehicles;
  }

  /**
   * Get unified schedule / calendar events for a vehicle across all booking sources & blocks
   */
  async getVehicleCalendar(orgId: string, vehicleId: string, startDate: Date, endDate: Date) {
    this.validateDateRange(startDate, endDate);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehicle not found in organization');
    }

    const [directBookings, partnerRentals, maintenance, blocks] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          vehicleId,
          bookingStatus: { not: BookingStatus.CANCELLED },
          pickupDateTime: { lt: endDate },
          returnDateTime: { gt: startDate },
        },
        include: {
          customerProfile: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.partnerRental.findMany({
        where: {
          vehicleId,
          status: { not: PartnerRentalStatus.CANCELLED },
          handoverDateTime: { lt: endDate },
          returnDateTime: { gt: startDate },
        },
        include: {
          requestingOrg: {
            select: { displayName: true },
          },
        },
      }),
      this.prisma.maintenanceRecord.findMany({
        where: {
          vehicleId,
          status: { not: MaintenanceStatus.CANCELLED },
          scheduledDate: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.vehicleBlock.findMany({
        where: {
          vehicleId,
          startDateTime: { lt: endDate },
          endDateTime: { gt: startDate },
        },
      }),
    ]);

    const events = [
      ...directBookings.map((b) => ({
        id: b.id,
        eventType: 'DIRECT_BOOKING',
        title: `Booking #${b.bookingNumber} - ${b.customerProfile?.firstName} ${b.customerProfile?.lastName}`,
        start: b.pickupDateTime,
        end: b.returnDateTime,
        status: b.bookingStatus,
        details: {
          bookingNumber: b.bookingNumber,
          pickupLocation: b.pickupLocation,
          returnLocation: b.returnLocation,
        },
      })),
      ...partnerRentals.map((pr) => ({
        id: pr.id,
        eventType: 'PARTNER_RENTAL',
        title: `Partner Rental - ${pr.requestingOrg?.displayName}`,
        start: pr.handoverDateTime,
        end: pr.returnDateTime,
        status: pr.status,
        details: {
          requestingOrg: pr.requestingOrg?.displayName,
        },
      })),
      ...maintenance.map((m) => ({
        id: m.id,
        eventType: 'MAINTENANCE',
        title: `Maintenance - ${m.title}`,
        start: m.scheduledDate,
        end: m.completedDate || m.scheduledDate,
        status: m.status,
        details: {
          cost: m.cost,
          description: m.description,
        },
      })),
      ...blocks.map((bl) => ({
        id: bl.id,
        eventType: 'VEHICLE_BLOCK',
        title: `Block (${bl.reason}) - ${bl.notes || ''}`,
        start: bl.startDateTime,
        end: bl.endDateTime,
        status: bl.reason,
        details: {
          notes: bl.notes,
        },
      })),
    ];

    return {
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
      },
      events: events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    };
  }
}
