import { Global, Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';

@Global()
@Module({
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
