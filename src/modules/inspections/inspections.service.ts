import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InspectionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateInspectionTemplateDto } from './dto/inspection-template.dto';
import { CreateVehicleInspectionDto } from './dto/create-inspection.dto';

@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  // ----------------------------------------------------
  // TEMPLATES
  // ----------------------------------------------------

  async createTemplate(orgId: string, dto: CreateInspectionTemplateDto) {
    if (dto.isDefault) {
      // Unset previous default of same type
      await this.prisma.inspectionTemplate.updateMany({
        where: { organizationId: orgId, inspectionType: dto.inspectionType },
        data: { isDefault: false },
      });
    }

    return this.prisma.inspectionTemplate.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        inspectionType: dto.inspectionType,
        isDefault: dto.isDefault || false,
        items: {
          create: dto.items.map((item, idx) => ({
            label: item.label,
            category: item.category,
            requiresPhoto: item.requiresPhoto || false,
            sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx,
          })),
        },
      },
      include: { items: true },
    });
  }

  async listTemplates(orgId: string, type?: InspectionType) {
    return this.prisma.inspectionTemplate.findMany({
      where: {
        organizationId: orgId,
        inspectionType: type || undefined,
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTemplate(orgId: string, id: string) {
    const template = await this.prisma.inspectionTemplate.findFirst({
      where: { id, organizationId: orgId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!template) {
      throw new NotFoundException('Inspection template not found');
    }

    return template;
  }

  // ----------------------------------------------------
  // INSPECTIONS
  // ----------------------------------------------------

  async createInspection(orgId: string, dto: CreateVehicleInspectionDto, actorUserId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in organization');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create inspection report
      const inspection = await tx.vehicleInspection.create({
        data: {
          organizationId: orgId,
          vehicleId: dto.vehicleId,
          bookingId: dto.bookingId,
          partnerRentalId: dto.partnerRentalId,
          type: dto.type,
          inspectedByUserId: actorUserId,
          mileage: dto.mileage,
          fuelLevel: dto.fuelLevel,
          overallCondition: dto.overallCondition || 'GOOD',
          customerSignatureUrl: dto.customerSignatureUrl,
          staffSignatureUrl: dto.staffSignatureUrl,
          notes: dto.notes,
          items: {
            create: dto.items.map((it) => ({
              templateItemId: it.templateItemId,
              label: it.label,
              status: it.status,
              notes: it.notes,
              photoUrls: it.photoUrls ? JSON.stringify(it.photoUrls) : Prisma.JsonNull,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Update Vehicle mileage
      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: { mileage: dto.mileage },
      });

      // 3. Update Booking pickup/return condition if linked
      if (dto.bookingId) {
        if (dto.type === 'DIRECT_PICKUP') {
          await tx.booking.update({
            where: { id: dto.bookingId },
            data: {
              pickupMileage: dto.mileage,
              pickupFuelLevel: dto.fuelLevel,
            },
          });
        } else if (dto.type === 'DIRECT_RETURN') {
          await tx.booking.update({
            where: { id: dto.bookingId },
            data: {
              returnMileage: dto.mileage,
              returnFuelLevel: dto.fuelLevel,
            },
          });
        }
      }

      await this.auditLogService.logEvent(
        {
          orgId,
          actorUserId,
          action: `CREATE_INSPECTION_${dto.type}`,
          entityType: 'VehicleInspection',
          entityId: inspection.id,
          newValue: inspection,
        },
        tx,
      );

      return inspection;
    });
  }

  async listInspections(orgId: string, vehicleId?: string, bookingId?: string, partnerRentalId?: string) {
    return this.prisma.vehicleInspection.findMany({
      where: {
        organizationId: orgId,
        vehicleId: vehicleId || undefined,
        bookingId: bookingId || undefined,
        partnerRentalId: partnerRentalId || undefined,
      },
      include: {
        items: true,
        vehicle: { select: { id: true, make: true, model: true, registrationNumber: true } },
      },
      orderBy: { inspectionDateTime: 'desc' },
    });
  }

  async getInspection(orgId: string, id: string) {
    const inspection = await this.prisma.vehicleInspection.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: true,
        vehicle: true,
        booking: { select: { id: true, bookingNumber: true, pickupDateTime: true, returnDateTime: true } },
      },
    });

    if (!inspection) {
      throw new NotFoundException('Vehicle inspection report not found');
    }

    return inspection;
  }
}
