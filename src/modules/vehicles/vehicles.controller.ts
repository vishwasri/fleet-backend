import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Vehicles Fleet (Internal Operations)')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Add a new vehicle to the organization fleet' })
  async create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(orgId, dto);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List fleet vehicles with pagination, category/status filters, and search' })
  async findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: VehicleQueryDto,
  ) {
    return this.vehiclesService.findAll(orgId, query);
  }

  @Get(':id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get full private operational details of a vehicle' })
  async findOne(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.findOne(orgId, id);
  }

  @Patch(':id')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update vehicle information, rates, notes, or public marketplace listing fields' })
  async update(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Delete vehicle if it has no active rentals' })
  async remove(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.remove(orgId, id);
  }

  @Get(':id/profitability')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Calculate detailed lifetime/historical profitability for a vehicle' })
  async getProfitability(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.getVehicleProfitability(orgId, id);
  }
}
