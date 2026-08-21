import { Global, Module } from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import { ExtensionsController } from './extensions.controller';
import { AvailabilityModule } from '../availability/availability.module';

@Global()
@Module({
  imports: [AvailabilityModule],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService],
})
export class ExtensionsModule {}
