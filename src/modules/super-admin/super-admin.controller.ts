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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import {
  UpdateCompanyDto,
  UpdateCompanyStatusDto,
  ResetOwnerPasswordDto,
} from './dto/update-company.dto';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';

@ApiTags('Super Admin - SaaS Platform Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get SaaS platform-wide KPI metrics and MRR distribution' })
  async getMetrics() {
    return this.superAdminService.getPlatformMetrics();
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get paginated list of companies with plan, status, and fleet quotas' })
  async getCompanies(@Query() query: QueryCompaniesDto) {
    return this.superAdminService.getCompanies(query);
  }

  @Post('companies')
  @ApiOperation({ summary: 'Register a new tenant company with primary owner administrator' })
  async registerCompany(@Body() dto: CreateCompanyDto) {
    return this.superAdminService.registerCompany(dto);
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Get full 360-degree company profile and operational limits' })
  async getCompany(@Param('id') id: string) {
    return this.superAdminService.getCompanyById(id);
  }

  @Patch('companies/:id')
  @ApiOperation({ summary: 'Update company profile, subscription tier, and vehicle limits' })
  async updateCompany(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.superAdminService.updateCompany(id, dto);
  }

  @Post('companies/:id/status')
  @ApiOperation({ summary: 'Activate, suspend, or cancel a company tenant account' })
  async setStatus(@Param('id') id: string, @Body() dto: UpdateCompanyStatusDto) {
    return this.superAdminService.setCompanyStatus(id, dto);
  }

  @Post('companies/:id/reset-password')
  @ApiOperation({ summary: 'Reset initial login credentials for the company owner' })
  async resetPassword(@Param('id') id: string, @Body() dto: ResetOwnerPasswordDto) {
    return this.superAdminService.resetOwnerPassword(id, dto.newPassword);
  }
}
