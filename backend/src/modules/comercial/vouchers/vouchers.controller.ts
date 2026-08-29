import { Controller, Get, Param } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

/**
 * Endpoint público (sin guards): el token del QR ya está firmado y se valida con
 * su propia firma, así que el cliente puede ver los datos de su reserva sin login.
 */
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('publico/:token')
  obtenerPublico(@Param('token') token: string) {
    return this.vouchersService.obtenerPublico(token);
  }
}
