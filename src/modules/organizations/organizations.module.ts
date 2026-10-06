import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';

@Module({
  controllers: [OrganizationsController, LocationsController],
  providers: [OrganizationsService, LocationsService],
  exports: [OrganizationsService, LocationsService],
})
export class OrganizationsModule {}
