import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  UpdateOrganizationDto,
  UpdateMarketplaceStatusDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/update-organization.dto';
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
  @ApiOperation({ summary: 'Get current organization details, settings, members, and quota summary' })
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

  @Get('current/members')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List all staff members and role assignments for current organization' })
  async getMembers(@CurrentOrgId() orgId: string) {
    return this.organizationsService.getMembers(orgId);
  }

  @Post('current/members')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Invite or onboard a new team member to current organization' })
  async addMember(
    @CurrentOrgId() orgId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.addMember(orgId, dto);
  }

  @Patch('current/members/:id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update role for an organization staff member' })
  async updateMemberRole(
    @CurrentOrgId() orgId: string,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(orgId, memberId, dto);
  }

  @Delete('current/members/:id')
  @Roles(OrgRole.OWNER)
  @ApiOperation({ summary: 'Remove a team member from the organization' })
  async removeMember(
    @CurrentOrgId() orgId: string,
    @Param('id') memberId: string,
  ) {
    return this.organizationsService.removeMember(orgId, memberId);
  }
}
