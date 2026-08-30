import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfirmarReservaDto {
  @IsString()
  formaPagoId: string;

  // Número/referencia del pago (comprobante, número de operación, últimos dígitos de tarjeta, etc.).
  // Obligatorio salvo que la forma de pago sea "efectivo" (validado en el service).
  @IsOptional()
  @IsString()
  referenciaExterna?: string;

  // Foto del comprobante en base64 (data URL), igual que el QR del voucher. Opcional.
  @IsOptional()
  @IsString()
  comprobanteUrl?: string;

  // Si no se especifica, se usa el total de la reserva. Obligatorio en reservas "múltiple"
  // (sin un total único porque cada servicio puede estar en una moneda distinta).
  @IsOptional()
  @IsNumber()
  monto?: number;

  // Igual que monto: obligatorio en reservas "múltiple", opcional en las demás (se usa la
  // moneda de la reserva).
  @IsOptional()
  @IsString()
  monedaId?: string;
}
