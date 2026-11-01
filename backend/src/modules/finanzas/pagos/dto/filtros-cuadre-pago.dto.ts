import { IsOptional, IsString } from 'class-validator';

/**
 * Filtros de GET /pagos/cuadre. Sin fechaInicio/fechaFin se suman todos los pagos percibidos
 * (sin límite de rango).
 */
export class FiltrosCuadrePagoDto {
  @IsOptional()
  @IsString()
  codigoReserva?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;
}
