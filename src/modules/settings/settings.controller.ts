import { Body, Controller, Get, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Organization Operational Settings')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get organization operational, compliance, and pricing settings' })
  async getSettings(@CurrentOrgId() orgId: string) {
    return this.settingsService.getSettings(orgId);
  }

  @Patch()
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update operational, compliance, deposit, and pricing rules' })
  async updateSettings(
    @CurrentOrgId() orgId: string,
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateSettings(orgId, dto, user.userId);
  }

  @Put('organization-profile')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update organization profile' })
  async updateProfile(
    @CurrentOrgId() orgId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateSettings(orgId, dto, user.userId);
  }

  @Put('pricing-defaults')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update pricing defaults' })
  async updatePricing(
    @CurrentOrgId() orgId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateSettings(orgId, {
      defaultDepositValue: dto.defaultSecurityDeposit,
      defaultExtraMileageRate: dto.excessMileageRatePerKm,
      defaultMileageLimitPerDay: dto.dailyMileageLimitKm,
      lateReturnGracePeriodMinutes: dto.lateReturnGracePeriodHours ? dto.lateReturnGracePeriodHours * 60 : undefined,
    }, user.userId);
  }

  @Put('inspection-settings')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update inspection settings' })
  async updateInspection(
    @CurrentOrgId() orgId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateSettings(orgId, {
      requireInspectionOnPickup: dto.requireMandatoryPhotos,
      requireInspectionOnReturn: true,
    }, user.userId);
  }

  @Put('compliance-settings')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update compliance settings' })
  async updateCompliance(
    @CurrentOrgId() orgId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateSettings(orgId, {
      documentExpiryAlertDays: dto.documentExpiryWarningDays,
      blockBookingsForExpiredInsurance: dto.blockRentalOnExpiredDoc,
    }, user.userId);
  }

  @Put('notification-preferences')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotifications(
    @CurrentOrgId() orgId: string,
    @Body() dto: any,
  ) {
    return { success: true };
  }

  @Post('staff')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Add staff member' })
  async addStaff(
    @CurrentOrgId() orgId: string,
    @Body() dto: any,
  ) {
    return { success: true };
  }
}
