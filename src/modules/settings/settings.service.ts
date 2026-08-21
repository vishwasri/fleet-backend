import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async getSettings(orgId: string) {
    let settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
    });

    if (!settings) {
      settings = await this.prisma.organizationSettings.create({
        data: {
          organizationId: orgId,
        },
      });
    }

    return settings;
  }

  async updateSettings(orgId: string, dto: UpdateSettingsDto, actorUserId?: string) {
    const current = await this.getSettings(orgId);

    const updated = await this.prisma.organizationSettings.update({
      where: { organizationId: orgId },
      data: {
        ...dto,
        defaultTaxRate: dto.defaultTaxRate !== undefined ? new Prisma.Decimal(dto.defaultTaxRate) : undefined,
        defaultDepositValue: dto.defaultDepositValue !== undefined ? new Prisma.Decimal(dto.defaultDepositValue) : undefined,
        defaultExtraMileageRate: dto.defaultExtraMileageRate !== undefined ? new Prisma.Decimal(dto.defaultExtraMileageRate) : undefined,
        defaultLateReturnRate: dto.defaultLateReturnRate !== undefined ? new Prisma.Decimal(dto.defaultLateReturnRate) : undefined,
      },
    });

    // Also update timezone/currency on organization if changed
    if (dto.currency || dto.timezone) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          currency: dto.currency || undefined,
          timezone: dto.timezone || undefined,
        },
      });
    }

    await this.auditLogService.logEvent({
      orgId,
      actorUserId,
      action: 'UPDATE_SETTINGS',
      entityType: 'OrganizationSettings',
      entityId: updated.id,
      previousValue: current,
      newValue: updated,
    });

    return updated;
  }
}
