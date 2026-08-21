import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  MaintenanceStatus,
  TransactionCategory,
  TransactionType,
  VehicleStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateMaintenanceDto, CreateVehicleBlockDto } from './dto/create-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
  ) {}

  // ==========================================
  // MAINTENANCE RECORDS
  // ==========================================

  async createMaintenance(orgId: string, dto: CreateMaintenanceDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in organization');
    }

    const scheduledDate = new Date(dto.scheduledDate);
    const completedDate = dto.completedDate ? new Date(dto.completedDate) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.create({
        data: {
          organizationId: orgId,
          vehicleId: dto.vehicleId,
          title: dto.title,
          description: dto.description,
          scheduledDate,
          completedDate,
          cost: new Prisma.Decimal(dto.cost || 0),
          status: dto.status || MaintenanceStatus.SCHEDULED,
          notes: dto.notes,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : Prisma.JsonNull,
        },
        include: {
          vehicle: true,
        },
      });

      // If status is in progress, mark vehicle status
      if (dto.status === MaintenanceStatus.IN_PROGRESS) {
        await tx.vehicle.update({
          where: { id: dto.vehicleId },
          data: { status: VehicleStatus.MAINTENANCE },
        });
      }

      // If already completed and cost > 0, log financial expense transaction
      if (dto.status === MaintenanceStatus.COMPLETED && (dto.cost || 0) > 0) {
        await tx.financialTransaction.create({
          data: {
            organizationId: orgId,
            vehicleId: dto.vehicleId,
            type: TransactionType.EXPENSE,
            category: TransactionCategory.MAINTENANCE,
            amount: new Prisma.Decimal(dto.cost),
            currency: 'USD',
            paymentMethod: 'COMPANY_ACCOUNT',
            notes: `Maintenance Expense: ${dto.title}`,
          },
        });
      }

      return record;
    });
  }

  async listMaintenance(orgId: string, vehicleId?: string) {
    return this.prisma.maintenanceRecord.findMany({
      where: {
        organizationId: orgId,
        vehicleId: vehicleId || undefined,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            registrationNumber: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async updateMaintenance(orgId: string, id: string, dto: Partial<CreateMaintenanceDto>) {
    const record = await this.prisma.maintenanceRecord.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!record) {
      throw new NotFoundException('Maintenance record not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
          completedDate: dto.completedDate ? new Date(dto.completedDate) : undefined,
          cost: dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : undefined,
          status: dto.status,
          notes: dto.notes,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : undefined,
        },
      });

      if (dto.status === MaintenanceStatus.COMPLETED) {
        await tx.vehicle.update({
          where: { id: record.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });

        const cost = dto.cost !== undefined ? dto.cost : Number(record.cost);
        if (cost > 0 && record.status !== MaintenanceStatus.COMPLETED) {
          await tx.financialTransaction.create({
            data: {
              organizationId: orgId,
              vehicleId: record.vehicleId,
              type: TransactionType.EXPENSE,
              category: TransactionCategory.MAINTENANCE,
              amount: new Prisma.Decimal(cost),
              currency: 'USD',
              paymentMethod: 'COMPANY_ACCOUNT',
              notes: `Maintenance Expense: ${updated.title}`,
            },
          });
        }
      }

      return updated;
    });
  }

  async deleteMaintenance(orgId: string, id: string) {
    const record = await this.prisma.maintenanceRecord.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!record) {
      throw new NotFoundException('Maintenance record not found');
    }

    return this.prisma.maintenanceRecord.delete({
      where: { id },
    });
  }

  // ==========================================
  // VEHICLE BLOCKS
  // ==========================================

  async createBlock(orgId: string, dto: CreateVehicleBlockDto) {
    this.availabilityService.validateDateRange(dto.startDateTime, dto.endDateTime);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in organization');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.availabilityService.assertVehicleAvailable(
        tx,
        dto.vehicleId,
        dto.startDateTime,
        dto.endDateTime,
      );

      return tx.vehicleBlock.create({
        data: {
          organizationId: orgId,
          vehicleId: dto.vehicleId,
          reason: dto.reason,
          startDateTime: dto.startDateTime,
          endDateTime: dto.endDateTime,
          notes: dto.notes,
        },
        include: {
          vehicle: true,
        },
      });
    });
  }

  async listBlocks(orgId: string, vehicleId?: string) {
    return this.prisma.vehicleBlock.findMany({
      where: {
        organizationId: orgId,
        vehicleId: vehicleId || undefined,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            registrationNumber: true,
          },
        },
      },
      orderBy: { startDateTime: 'desc' },
    });
  }

  async deleteBlock(orgId: string, id: string) {
    const block = await this.prisma.vehicleBlock.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!block) {
      throw new NotFoundException('Vehicle block not found');
    }

    return this.prisma.vehicleBlock.delete({
      where: { id },
    });
  }
}
