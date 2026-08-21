import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepositsService } from './deposits.service';
import {
  CreateDepositDto,
  DeductDepositDto,
  ForfeitDepositDto,
  MarkDepositReceivedDto,
  RefundDepositDto,
} from './dto/deposit-ops.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Deposit Management (Security Deposits)')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Create a security deposit record for a booking or partner rental' })
  async create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateDepositDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositsService.createDeposit(orgId, dto, user.userId);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List security deposits with booking/partner filters' })
  async list(
    @CurrentOrgId() orgId: string,
    @Query('bookingId') bookingId?: string,
    @Query('partnerRentalId') partnerRentalId?: string,
  ) {
    return this.depositsService.listDeposits(orgId, bookingId, partnerRentalId);
  }

  @Get(':id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get details and deduction/refund balance of a deposit' })
  async findOne(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.depositsService.getDepositDetails(orgId, id);
  }

  @Post(':id/received')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Mark deposit received (cash, pre-auth, credit card)' })
  async markReceived(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: MarkDepositReceivedDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositsService.markReceived(orgId, id, dto, user.userId);
  }

  @Post(':id/deduct')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Deduct amount from deposit for damages/penalties and post to income' })
  async deduct(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: DeductDepositDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositsService.deductDeposit(orgId, id, dto, user.userId);
  }

  @Post(':id/refund')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Refund remaining or partial deposit balance and post to ledger' })
  async refund(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: RefundDepositDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositsService.refundDeposit(orgId, id, dto, user.userId);
  }

  @Post(':id/forfeit')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Forfeit full remaining deposit on contract breach and post to income' })
  async forfeit(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: ForfeitDepositDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositsService.forfeitDeposit(orgId, id, dto, user.userId);
  }
}
