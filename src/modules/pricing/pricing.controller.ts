import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculateBookingPriceDto } from './dto/calculate-price.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('Pricing Engine')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('internal/pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Calculate detailed auditable price breakdown (rent, tax, deposit, discounts)' })
  async calculate(
    @CurrentOrgId() orgId: string,
    @Body() dto: CalculateBookingPriceDto,
  ) {
    return this.pricingService.calculateBookingPricing(orgId, dto);
  }
}
