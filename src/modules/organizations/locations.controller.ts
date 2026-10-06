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
import { LocationsService } from './locations.service';
import { CreateBranchLocationDto, UpdateBranchLocationDto } from './dto/branch-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Branch Locations & Hubs (Internal Operations)')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List all active branch locations, airport hubs, and parking depots for current organization' })
  async getLocations(@CurrentOrgId() orgId: string) {
    return this.locationsService.getLocations(orgId);
  }

  @Get(':id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get branch location details by ID' })
  async getLocationById(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.locationsService.getLocationById(orgId, id);
  }

  @Post()
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Create a new branch location or parking depot' })
  async createLocation(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateBranchLocationDto,
  ) {
    return this.locationsService.createLocation(orgId, dto);
  }

  @Patch(':id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing branch location or parking depot' })
  async updateLocation(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBranchLocationDto,
  ) {
    return this.locationsService.updateLocation(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a branch location' })
  async deleteLocation(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.locationsService.deleteLocation(orgId, id);
  }
}
