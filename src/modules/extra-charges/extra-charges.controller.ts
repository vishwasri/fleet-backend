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
import { ExtraChargesService } from './extra-charges.service';
import { CreateExtraChargeDto } from './dto/create-extra-charge.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Extra Charges & Damage Incident Billing')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/extra-charges')
export class ExtraChargesController {
  constructor(private readonly extraChargesService: ExtraChargesService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Add an extra charge (damage, fuel shortage, late return, cleaning, fines)' })
  async create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateExtraChargeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extraChargesService.createExtraCharge(orgId, dto, user.userId);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List extra charges with booking/partner filters' })
  async list(
    @CurrentOrgId() orgId: string,
    @Query('bookingId') bookingId?: string,
    @Query('partnerRentalId') partnerRentalId?: string,
  ) {
    return this.extraChargesService.listExtraCharges(orgId, bookingId, partnerRentalId);
  }

  @Post(':id/approve')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Approve extra charge (updates rental balance & financial ledger)' })
  async approve(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extraChargesService.approveExtraCharge(orgId, id, user.userId);
  }

  @Patch(':id/waive')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Waive an extra charge' })
  async waive(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extraChargesService.waiveExtraCharge(orgId, id, user.userId);
  }
}
