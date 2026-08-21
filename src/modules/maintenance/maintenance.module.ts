import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AvailabilityModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
