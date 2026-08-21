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
import { InspectionsService } from './inspections.service';
import { CreateInspectionTemplateDto } from './dto/inspection-template.dto';
import { CreateVehicleInspectionDto } from './dto/create-inspection.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InspectionType, OrgRole } from '@prisma/client';

@ApiTags('Vehicle Inspection Checklists & Reports')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  // ----------------------------------------------------
  // TEMPLATES
  // ----------------------------------------------------

  @Post('templates')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Create a reusable inspection checklist template' })
  async createTemplate(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateInspectionTemplateDto,
  ) {
    return this.inspectionsService.createTemplate(orgId, dto);
  }

  @Get('templates')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List inspection templates by type' })
  async listTemplates(
    @CurrentOrgId() orgId: string,
    @Query('type') type?: InspectionType,
  ) {
    return this.inspectionsService.listTemplates(orgId, type);
  }

  @Get('templates/:id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get inspection template details and items' })
  async getTemplate(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.inspectionsService.getTemplate(orgId, id);
  }

  // ----------------------------------------------------
  // INSPECTIONS
  // ----------------------------------------------------

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Submit a vehicle inspection report (pickup, return, handover)' })
  async createInspection(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateVehicleInspectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inspectionsService.createInspection(orgId, dto, user.userId);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List completed inspections with vehicle/booking filters' })
  async listInspections(
    @CurrentOrgId() orgId: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('partnerRentalId') partnerRentalId?: string,
  ) {
    return this.inspectionsService.listInspections(orgId, vehicleId, bookingId, partnerRentalId);
  }

  @Get(':id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get full vehicle inspection report, item checklist, and signatures' })
  async getInspection(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.inspectionsService.getInspection(orgId, id);
  }
}
