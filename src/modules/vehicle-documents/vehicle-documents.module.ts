import { Global, Module } from '@nestjs/common';
import { VehicleDocumentsService } from './vehicle-documents.service';
import { VehicleDocumentsController } from './vehicle-documents.controller';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  controllers: [VehicleDocumentsController],
  providers: [VehicleDocumentsService],
  exports: [VehicleDocumentsService],
})
export class VehicleDocumentsModule {}
