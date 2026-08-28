import { Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { QrTokenService } from './qr-token.service';

@Module({
  providers: [VouchersService, QrTokenService],
  exports: [VouchersService, QrTokenService],
})
export class VouchersModule {}
