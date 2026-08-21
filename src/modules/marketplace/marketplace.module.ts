import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { PublicMarketplaceController } from './public-marketplace.controller';
import { CustomerMarketplaceController } from './customer-marketplace.controller';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AvailabilityModule],
  controllers: [PublicMarketplaceController, CustomerMarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
