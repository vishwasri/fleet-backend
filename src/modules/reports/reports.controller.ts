import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('comprehensive')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Comprehensive fleet business performance report' })
  async getComprehensive(
    @CurrentOrgId() orgId: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getComprehensiveReport(
      orgId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('vehicle-yields')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Vehicle yield and ROI rankings' })
  async getVehicleYields(@CurrentOrgId() orgId: string) {
    return this.reportsService.getVehicleYields(orgId);
  }

  @Get('revenue')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Revenue breakdown: Direct vs Partner B2B revenue and profit' })
  async getRevenue(
    @CurrentOrgId() orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getRevenueComparison(
      orgId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('utilization')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Fleet utilization report across direct bookings and partner rentals' })
  async getUtilization(
    @CurrentOrgId() orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFleetUtilization(
      orgId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('partner-settlements')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Partner receivables and payables settlement report' })
  async getPartnerSettlements(@CurrentOrgId() orgId: string) {
    return this.reportsService.getPartnerSettlements(orgId);
  }

  @Get('marketplace-performance')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Version 2 Marketplace Performance metrics stub' })
  async getMarketplacePerformance(@CurrentOrgId() orgId: string) {
    return this.reportsService.getMarketplacePerformanceStub(orgId);
  }
}
