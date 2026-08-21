import { Global, Module } from '@nestjs/common';
import { ExtraChargesService } from './extra-charges.service';
import { ExtraChargesController } from './extra-charges.controller';

@Global()
@Module({
  controllers: [ExtraChargesController],
  providers: [ExtraChargesService],
  exports: [ExtraChargesService],
})
export class ExtraChargesModule {}
