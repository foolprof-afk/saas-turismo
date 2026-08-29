import { Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { QrTokenService } from './qr-token.service';

@Module({
  controllers: [VouchersController],
  providers: [VouchersService, QrTokenService],
  exports: [VouchersService, QrTokenService],
})
export class VouchersModule {}
