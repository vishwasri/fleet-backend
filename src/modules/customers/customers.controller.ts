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
import { CustomersService } from './customers.service';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Customer Profiles (Direct Operational Records)')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Create private customer record for direct rentals' })
  async create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateCustomerProfileDto,
  ) {
    return this.customersService.create(orgId, dto);
  }

  @Get()
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List customer profiles in the current organization with pagination & search' })
  async findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customersService.findAll(orgId, query);
  }

  @Get(':id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get details and booking history of a customer profile' })
  async findOne(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(orgId, id);
  }

  @Patch(':id')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Update customer contact info, license details, or notes' })
  async update(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customersService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Delete a customer record from the organization' })
  async remove(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(orgId, id);
  }
}
