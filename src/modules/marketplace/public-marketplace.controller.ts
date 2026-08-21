import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { PublicVehicleSearchDto } from './dto/public-search.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public Marketplace (Version 2 Foundation)')
@Public()
@Controller('public')
export class PublicMarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('vehicles')
  @ApiOperation({
    summary: 'Public vehicle discovery: returns only published vehicles from published organizations with zero private operational data',
  })
  async searchVehicles(@Query() query: PublicVehicleSearchDto) {
    return this.marketplaceService.searchPublicVehicles(query);
  }

  @Get('vehicles/:id')
  @ApiOperation({ summary: 'Get publicly viewable listing details for a vehicle' })
  async getVehicleDetails(@Param('id') vehicleId: string) {
    return this.marketplaceService.getPublicVehicleDetails(vehicleId);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get publicly viewable company profile and available published fleet' })
  async getOrganizationProfile(@Param('id') orgId: string) {
    return this.marketplaceService.getPublicOrganizationProfile(orgId);
  }
}
