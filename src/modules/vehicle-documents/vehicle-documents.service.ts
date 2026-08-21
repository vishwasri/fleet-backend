import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DocumentStatus, DocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateVehicleDocumentDto, UpdateVehicleDocumentDto } from './dto/create-document.dto';

@Injectable()
export class VehicleDocumentsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private auditLogService: AuditLogService,
  ) {}

  calculateDocumentStatus(expiryDate?: Date | null, alertDays = 30): DocumentStatus {
    if (!expiryDate) return DocumentStatus.VALID;
    const now = new Date();
    const expiry = new Date(expiryDate);

    if (expiry.getTime() < now.getTime()) {
      return DocumentStatus.EXPIRED;
    }

    const alertThreshold = new Date(now.getTime() + alertDays * 24 * 60 * 60 * 1000);
    if (expiry.getTime() <= alertThreshold.getTime()) {
      return DocumentStatus.EXPIRING_SOON;
    }

    return DocumentStatus.VALID;
  }

  async createDocument(orgId: string, dto: CreateVehicleDocumentDto, actorUserId?: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in organization');
    }

    const settings = await this.settingsService.getSettings(orgId);
    const status = this.calculateDocumentStatus(dto.expiryDate, settings.documentExpiryAlertDays);

    const doc = await this.prisma.vehicleDocument.create({
      data: {
        organizationId: orgId,
        vehicleId: dto.vehicleId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        fileUrl: dto.fileUrl,
        status,
        notes: dto.notes,
      },
    });

    // Also update vehicle's insuranceExpiryDate or registrationExpiryDate on vehicle model if applicable
    if (dto.documentType === DocumentType.INSURANCE && dto.expiryDate) {
      await this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data: { insuranceExpiryDate: dto.expiryDate },
      });
    } else if (dto.documentType === DocumentType.REGISTRATION && dto.expiryDate) {
      await this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data: { registrationExpiryDate: dto.expiryDate },
      });
    }

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'CREATE_VEHICLE_DOCUMENT',
      entityType: 'VehicleDocument',
      entityId: doc.id,
      newValue: doc,
    });

    return doc;
  }

  async listDocuments(orgId: string, vehicleId?: string, isArchived = false) {
    const settings = await this.settingsService.getSettings(orgId);
    const docs = await this.prisma.vehicleDocument.findMany({
      where: {
        organizationId: orgId,
        vehicleId: vehicleId || undefined,
        isArchived,
      },
      include: {
        vehicle: {
          select: { id: true, make: true, model: true, registrationNumber: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    // Recalculate status dynamically on list
    return docs.map((d) => ({
      ...d,
      status: this.calculateDocumentStatus(d.expiryDate, settings.documentExpiryAlertDays),
    }));
  }

  async updateDocument(orgId: string, id: string, dto: UpdateVehicleDocumentDto, actorUserId?: string) {
    const current = await this.prisma.vehicleDocument.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!current) {
      throw new NotFoundException('Vehicle document not found');
    }

    const settings = await this.settingsService.getSettings(orgId);
    const expiry = dto.expiryDate !== undefined ? dto.expiryDate : current.expiryDate;
    const status = this.calculateDocumentStatus(expiry, settings.documentExpiryAlertDays);

    const updated = await this.prisma.vehicleDocument.update({
      where: { id },
      data: {
        documentType: dto.documentType || current.documentType,
        documentNumber: dto.documentNumber !== undefined ? dto.documentNumber : current.documentNumber,
        issueDate: dto.issueDate !== undefined ? dto.issueDate : current.issueDate,
        expiryDate: dto.expiryDate !== undefined ? dto.expiryDate : current.expiryDate,
        fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : current.fileUrl,
        status,
        notes: dto.notes !== undefined ? dto.notes : current.notes,
      },
    });

    // Sync vehicle model dates
    if (updated.documentType === DocumentType.INSURANCE && updated.expiryDate) {
      await this.prisma.vehicle.update({
        where: { id: updated.vehicleId },
        data: { insuranceExpiryDate: updated.expiryDate },
      });
    } else if (updated.documentType === DocumentType.REGISTRATION && updated.expiryDate) {
      await this.prisma.vehicle.update({
        where: { id: updated.vehicleId },
        data: { registrationExpiryDate: updated.expiryDate },
      });
    }

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'UPDATE_VEHICLE_DOCUMENT',
      entityType: 'VehicleDocument',
      entityId: updated.id,
      previousValue: current,
      newValue: updated,
    });

    return updated;
  }

  async archiveDocument(orgId: string, id: string, actorUserId?: string) {
    const current = await this.prisma.vehicleDocument.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!current) {
      throw new NotFoundException('Vehicle document not found');
    }

    const archived = await this.prisma.vehicleDocument.update({
      where: { id },
      data: { isArchived: true },
    });

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'ARCHIVE_VEHICLE_DOCUMENT',
      entityType: 'VehicleDocument',
      entityId: archived.id,
      previousValue: current,
      newValue: archived,
    });

    return { message: 'Document archived successfully' };
  }

  /**
   * Evaluates vehicle compliance rules against organization settings.
   * Throws ConflictException with detailed reason if blocked.
   */
  async assertVehicleCompliant(orgId: string, vehicleId: string): Promise<void> {
    const settings = await this.settingsService.getSettings(orgId);
    const now = new Date();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId: orgId },
      include: {
        documents: {
          where: { isArchived: false },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // 1. Insurance check
    if (settings.blockBookingsForExpiredInsurance) {
      const insuranceDoc = vehicle.documents.find((d) => d.documentType === DocumentType.INSURANCE);
      const isExpired = insuranceDoc?.expiryDate
        ? new Date(insuranceDoc.expiryDate).getTime() < now.getTime()
        : vehicle.insuranceExpiryDate
          ? new Date(vehicle.insuranceExpiryDate).getTime() < now.getTime()
          : false;

      if (isExpired) {
        throw new ConflictException(
          `Vehicle ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}) has EXPIRED INSURANCE. Booking blocked by compliance policy.`,
        );
      }
    }

    // 2. Registration check
    if (settings.blockBookingsForExpiredRegistration) {
      const regDoc = vehicle.documents.find((d) => d.documentType === DocumentType.REGISTRATION);
      const isExpired = regDoc?.expiryDate
        ? new Date(regDoc.expiryDate).getTime() < now.getTime()
        : vehicle.registrationExpiryDate
          ? new Date(vehicle.registrationExpiryDate).getTime() < now.getTime()
          : false;

      if (isExpired) {
        throw new ConflictException(
          `Vehicle ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}) has EXPIRED REGISTRATION. Booking blocked by compliance policy.`,
        );
      }
    }

    // 3. Required documents check
    if (settings.blockBookingsForExpiredRequiredDocuments) {
      const expiredDoc = vehicle.documents.find(
        (d) => d.expiryDate && new Date(d.expiryDate).getTime() < now.getTime(),
      );
      if (expiredDoc) {
        throw new ConflictException(
          `Vehicle ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}) has expired compliance document (${expiredDoc.documentType}: #${expiredDoc.documentNumber || 'N/A'}). Booking blocked.`,
        );
      }
    }
  }

  async getExpiringDocumentsAlerts(orgId: string) {
    const settings = await this.settingsService.getSettings(orgId);
    const docs = await this.prisma.vehicleDocument.findMany({
      where: { organizationId: orgId, isArchived: false },
      include: {
        vehicle: { select: { id: true, make: true, model: true, registrationNumber: true } },
      },
    });

    const expiring = [];
    const expired = [];

    for (const d of docs) {
      const st = this.calculateDocumentStatus(d.expiryDate, settings.documentExpiryAlertDays);
      if (st === DocumentStatus.EXPIRED) {
        expired.push(d);
      } else if (st === DocumentStatus.EXPIRING_SOON) {
        expiring.push(d);
      }
    }

    return {
      expiredCount: expired.length,
      expiringSoonCount: expiring.length,
      expired,
      expiringSoon: expiring,
    };
  }
}
