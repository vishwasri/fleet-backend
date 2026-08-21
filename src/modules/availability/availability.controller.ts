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
import { AvailabilityService } from './availability.service';
import { CheckVehicleAvailabilityDto, SearchAvailableVehiclesDto } from './dto/check-availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Availability Engine')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('check')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Check specific vehicle availability against direct bookings, partner rentals, maintenance, & blocks' })
  async checkVehicle(@Body() dto: CheckVehicleAvailabilityDto) {
    return this.availabilityService.checkVehicleAvailability(dto);
  }

  @Post('search')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Search all available vehicles for a date range in the organization' })
  async searchAvailable(
    @CurrentOrgId() orgId: string,
    @Body() dto: SearchAvailableVehiclesDto,
  ) {
    return this.availabilityService.searchAvailableVehicles(orgId, dto);
  }

  @Get('calendar/:vehicleId')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get unified multi-source calendar for a vehicle' })
  async getCalendar(
    @CurrentOrgId() orgId: string,
    @Param('vehicleId') vehicleId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.availabilityService.getVehicleCalendar(
      orgId,
      vehicleId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
