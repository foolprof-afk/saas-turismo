import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerarLinkPagoDto {
  // Si no se especifica, se usa la única pasarela activa de la agencia (error si hay 0 o más de 1).
  @IsOptional()
  @IsString()
  pasarelaPagoId?: string;

  // Igual que en confirmar reserva: obligatorio en reservas "múltiple", opcional en las demás
  // (se usa la moneda de la reserva).
  @IsOptional()
  @IsString()
  monedaId?: string;

  // Si no se especifica, se usa el saldo pendiente de la reserva en esa moneda.
  @IsOptional()
  @IsNumber()
  monto?: number;
}
