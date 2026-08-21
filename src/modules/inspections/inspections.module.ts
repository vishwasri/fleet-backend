import { Global, Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';

@Global()
@Module({
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
