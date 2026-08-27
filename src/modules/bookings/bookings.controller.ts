import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  BookingQueryDto,
  UpdateBookingDto,
  PickupHandoverDto,
  ReturnInspectionDto,
  AddBookingPaymentDto,
} from './dto/booking-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { MarkNoShowDto } from './dto/no-show.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Direct Bookings (Internal Operations)')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  required: false,
  description: 'Target tenant organization UUID',
})
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Create a new direct rental booking (with availability & compliance safety)' })
  async create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.create(orgId, dto, user.userId);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List direct bookings with status, date, vehicle, and customer filters' })
  async findAll(@CurrentOrgId() orgId: string, @Query() query: BookingQueryDto) {
    return this.bookingsService.findAll(orgId, query);
  }

  @Get(':id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get direct booking details with payments, deposits, inspections, and extensions' })
  async findOne(@CurrentOrgId() orgId: string, @Param('id') id: string) {
    return this.bookingsService.findOne(orgId, id);
  }

  @Put(':id')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update direct booking dates, rates, vehicle, or customer' })
  async update(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.update(orgId, id, dto, user.userId);
  }

  @Put(':id/status')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update direct booking status' })
  async updateStatusPut(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.update(orgId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update direct booking status' })
  async updateStatusPatch(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.update(orgId, id, dto, user.userId);
  }

  @Post(':id/pickup')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Record customer pickup (mileage, fuel level) and set vehicle status' })
  async pickupHandover(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: PickupHandoverDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.pickupHandover(orgId, id, dto, user.userId);
  }

  @Post(':id/return')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Record vehicle return (mileage, fuel level) and mark completed' })
  async returnInspection(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: ReturnInspectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.returnInspection(orgId, id, dto, user.userId);
  }

  @Post(':id/cancel')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Cancel booking with optional cancellation fees, refunds, and availability release' })
  async cancel(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.cancelBooking(orgId, id, dto, user.userId);
  }

  @Post(':id/no-show')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Mark booking as NO_SHOW with optional penalty fees and availability release' })
  async noShow(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: MarkNoShowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.markNoShow(orgId, id, dto, user.userId);
  }

  @Post(':id/payments')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Add a payment to a booking and update financial ledger' })
  async addPayment(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: AddBookingPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.addPayment(orgId, id, dto, user.userId);
  }
}
