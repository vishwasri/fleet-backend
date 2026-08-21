import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExtensionsService } from './extensions.service';
import { RequestExtensionDto, RejectExtensionDto } from './dto/extension-ops.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Rental Extensions')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Request rental extension for a direct booking or partner rental' })
  async request(
    @CurrentOrgId() orgId: string,
    @Body() dto: RequestExtensionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extensionsService.requestExtension(orgId, dto, user.userId);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List rental extensions with filters' })
  async list(
    @CurrentOrgId() orgId: string,
    @Query('bookingId') bookingId?: string,
    @Query('partnerRentalId') partnerRentalId?: string,
  ) {
    return this.extensionsService.listExtensions(orgId, bookingId, partnerRentalId);
  }

  @Post(':id/approve')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Approve rental extension (checks availability transactionally & updates booking)' })
  async approve(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extensionsService.approveExtension(orgId, id, user.userId);
  }

  @Post(':id/reject')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Reject rental extension' })
  async reject(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: RejectExtensionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extensionsService.rejectExtension(orgId, id, dto, user.userId);
  }

  @Patch(':id/cancel')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Cancel pending extension request' })
  async cancel(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extensionsService.cancelExtension(orgId, id, user.userId);
  }
}
