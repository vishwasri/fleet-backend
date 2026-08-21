import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto, UpdateMarketplaceStatusDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Organizations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get current organization details, settings and summary stats' })
  async getCurrentOrganization(@CurrentOrgId() orgId: string) {
    return this.organizationsService.getOrganization(orgId);
  }

  @Patch('current')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update organization profile and operational settings' })
  async updateOrganization(
    @CurrentOrgId() orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganization(orgId, dto);
  }

  @Patch('current/marketplace-status')
  @Roles(OrgRole.OWNER)
  @ApiOperation({ summary: 'Update organization public marketplace visibility status (PRIVATE, PUBLISHED, etc.)' })
  async updateMarketplaceStatus(
    @CurrentOrgId() orgId: string,
    @Body() dto: UpdateMarketplaceStatusDto,
  ) {
    return this.organizationsService.updateMarketplaceStatus(orgId, dto);
  }
}
