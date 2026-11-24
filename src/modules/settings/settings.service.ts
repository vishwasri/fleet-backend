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

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    const staffMembers = org?.members.map((m) => ({
      id: m.id,
      fullName: `${m.user.firstName} ${m.user.lastName}`,
      role: m.role,
      email: m.user.email,
      phone: m.user.phone || '',
      isActive: m.status === 'ACTIVE',
    })) || [];

    return {
      businessCurrency: org?.currency || settings.currency || 'USD',
      businessTimezone: org?.timezone || settings.timezone || 'UTC',
      profile: {
        companyName: org?.legalName || org?.displayName || 'Fleet Company',
        registrationNumber: org?.businessRegNumber || org?.id || '',
        taxId: org?.taxId || '',
        registeredHub: org?.displayName || 'Main Hub',
        contactEmail: org?.email || '',
        contactPhone: org?.phone || '',
        address: org?.address || '',
        isVerifiedB2B: true,
      },
      pricingDefaults: {
        defaultDailyRate: 100.0,
        defaultSecurityDeposit: Number(settings.defaultDepositValue || 250.0),
        minimumRentalDays: 1,
        excessMileageRatePerKm: Number(settings.defaultExtraMileageRate || 0.35),
        dailyMileageLimitKm: settings.defaultMileageLimitPerDay || 200,
        lateReturnGracePeriodHours: (settings.lateReturnGracePeriodMinutes || 60) / 60,
        defaultCleaningFee: 25.0,
      },
      inspectionSettings: {
        requireMandatoryPhotos: settings.requireInspectionOnPickup,
        minimumPhotosCount: 4,
        requireDualSignatures: true,
        strictFuelGaugeMatching: true,
        requireOdometerSnapshot: true,
      },
      complianceSettings: {
        requireDrivingLicenseValidation: true,
        requireNationalIdValidation: true,
        documentExpiryWarningDays: settings.documentExpiryAlertDays || 30,
        blockRentalOnExpiredDoc: settings.blockBookingsForExpiredInsurance,
      },
      notificationPreferences: {
        pushNotificationsEnabled: true,
        smsAlertsEnabled: false,
        emailReportsEnabled: true,
        notifyOnPickupReturnDue: true,
        notifyOnOverduePayments: true,
        notifyOnPartnerBroadcasts: true,
        notifyOnMaintenanceDue: true,
      },
      staffMembers,
      ...settings,
    };
  }

  async updateSettings(orgId: string, dto: UpdateSettingsDto, actorUserId?: string) {
    const current = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
    });

    const updateData = {
      ...dto,
      defaultTaxRate: dto.defaultTaxRate !== undefined ? new Prisma.Decimal(dto.defaultTaxRate) : undefined,
      defaultDepositValue: dto.defaultDepositValue !== undefined ? new Prisma.Decimal(dto.defaultDepositValue) : undefined,
      defaultExtraMileageRate: dto.defaultExtraMileageRate !== undefined ? new Prisma.Decimal(dto.defaultExtraMileageRate) : undefined,
      defaultLateReturnRate: dto.defaultLateReturnRate !== undefined ? new Prisma.Decimal(dto.defaultLateReturnRate) : undefined,
    };

    const updated = await this.prisma.organizationSettings.upsert({
      where: { organizationId: orgId },
      update: updateData,
      create: {
        organizationId: orgId,
        ...updateData,
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
