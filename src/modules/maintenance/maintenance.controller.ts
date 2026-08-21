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
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto, CreateVehicleBlockDto } from './dto/create-maintenance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Maintenance & Vehicle Blocks')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // Maintenance Records
  @Post('maintenance')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Schedule or record vehicle maintenance service' })
  async createMaintenance(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateMaintenanceDto,
  ) {
    return this.maintenanceService.createMaintenance(orgId, dto);
  }

  @Get('maintenance')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List all maintenance records in organization' })
  async listMaintenance(
    @CurrentOrgId() orgId: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.maintenanceService.listMaintenance(orgId, vehicleId);
  }

  @Patch('maintenance/:id')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update maintenance record or mark completed' })
  async updateMaintenance(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMaintenanceDto>,
  ) {
    return this.maintenanceService.updateMaintenance(orgId, id, dto);
  }

  @Delete('maintenance/:id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Delete maintenance record' })
  async deleteMaintenance(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.maintenanceService.deleteMaintenance(orgId, id);
  }

  // Vehicle Blocks
  @Post('blocks')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Create a vehicle blocking period (Maintenance, Owner Use, etc.)' })
  async createBlock(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateVehicleBlockDto,
  ) {
    return this.maintenanceService.createBlock(orgId, dto);
  }

  @Get('blocks')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List vehicle blocks in organization' })
  async listBlocks(
    @CurrentOrgId() orgId: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.maintenanceService.listBlocks(orgId, vehicleId);
  }

  @Delete('blocks/:id')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Remove a vehicle block' })
  async deleteBlock(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.maintenanceService.deleteBlock(orgId, id);
  }
}
