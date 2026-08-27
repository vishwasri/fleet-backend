import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get mobile dashboard summary metrics, KPIs, today schedule, and alerts' })
  async getDashboardSummary(@CurrentOrgId() orgId: string) {
    return this.dashboardService.getDashboardSummary(orgId);
  }

  @Get('alerts')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get dashboard alert notifications' })
  async getDashboardAlerts(@CurrentOrgId() orgId: string) {
    const summary = await this.dashboardService.getDashboardSummary(orgId);
    return summary.alerts;
  }

  @Get('pulse')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get operational pulse: fleet stats, today pickups/returns, monthly revenue, balances & alerts' })
  async getOperationalPulse(@CurrentOrgId() orgId: string) {
    return this.dashboardService.getOperationalPulse(orgId);
  }
}
