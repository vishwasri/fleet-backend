import { Module } from '@nestjs/common';
import { PartnerNetworkService } from './partner-network.service';
import { PartnerNetworkController } from './partner-network.controller';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AvailabilityModule],
  controllers: [PartnerNetworkController],
  providers: [PartnerNetworkService],
  exports: [PartnerNetworkService],
})
export class PartnerNetworkModule {}
