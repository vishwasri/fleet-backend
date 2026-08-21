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
import { VehicleDocumentsService } from './vehicle-documents.service';
import { CreateVehicleDocumentDto, UpdateVehicleDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Vehicle Document Compliance')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/vehicle-documents')
export class VehicleDocumentsController {
  constructor(private readonly documentsService: VehicleDocumentsService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Add a new vehicle document (Insurance, Registration, Revenue License, etc.)' })
  async create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateVehicleDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.createDocument(orgId, dto, user.userId);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List vehicle documents in organization with dynamic validity status' })
  async findAll(
    @CurrentOrgId() orgId: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('isArchived') isArchived = false,
  ) {
    return this.documentsService.listDocuments(orgId, vehicleId, isArchived);
  }

  @Get('alerts')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get summary of expiring soon and expired vehicle documents' })
  async getAlerts(@CurrentOrgId() orgId: string) {
    return this.documentsService.getExpiringDocumentsAlerts(orgId);
  }

  @Patch(':id')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update vehicle document' })
  async update(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.updateDocument(orgId, id, dto, user.userId);
  }

  @Delete(':id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Archive a vehicle document (preserves compliance history)' })
  async archive(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.archiveDocument(orgId, id, user.userId);
  }
}
