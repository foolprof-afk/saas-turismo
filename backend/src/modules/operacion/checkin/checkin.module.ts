import { Module } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { VouchersModule } from '../../comercial/vouchers/vouchers.module';

@Module({
  imports: [VouchersModule],
  providers: [CheckinService],
  controllers: [CheckinController],
})
export class CheckinModule {}
