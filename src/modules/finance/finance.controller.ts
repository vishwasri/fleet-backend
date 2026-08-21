import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateTransactionDto, FinanceQueryDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Finance, Income & Expenses')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Record a new income or expense transaction (fuel, repair, fine, etc.)' })
  async createTransaction(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.financeService.createTransaction(orgId, dto);
  }

  @Get('transactions')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List financial transactions with filters, pagination, and sorting' })
  async findAllTransactions(
    @CurrentOrgId() orgId: string,
    @Query() query: FinanceQueryDto,
  ) {
    return this.financeService.findAllTransactions(orgId, query);
  }

  @Get('summary')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get total income, expenses, net profit, and category breakdowns' })
  async getSummary(
    @CurrentOrgId() orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getFinancialSummary(
      orgId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
