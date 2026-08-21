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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { InviteStaffDto, UpdateMemberRoleDto } from './dto/invite-staff.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Organization Staff & Users')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/members')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List all staff and members in current organization' })
  async listMembers(@CurrentOrgId() orgId: string) {
    return this.usersService.listOrganizationMembers(orgId);
  }

  @Post('invite')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Invite or add a new staff member to the organization' })
  async inviteStaff(
    @CurrentOrgId() orgId: string,
    @Body() dto: InviteStaffDto,
  ) {
    return this.usersService.inviteOrAddStaff(orgId, dto);
  }

  @Patch(':id/role')
  @Roles(OrgRole.OWNER)
  @ApiOperation({ summary: 'Update a member role (ADMIN, STAFF, VIEWER)' })
  async updateRole(
    @CurrentOrgId() orgId: string,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateMemberRole(orgId, memberId, dto, user.userId);
  }

  @Delete(':id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @CurrentOrgId() orgId: string,
    @Param('id') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.removeMember(orgId, memberId, user.userId);
  }
}
