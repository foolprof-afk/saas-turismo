import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Filtros de búsqueda de órdenes de servicio (GET /ordenes-servicio): por proveedor y por
 * rango de fecha de ejecución del servicio. Como la fecha vive en cada item, una orden
 * coincide con el rango si AL MENOS uno de sus items cae dentro de él (ver
 * OrdenesServicioService.findAll).
 */
export class FiltrosOrdenServicioDto {
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @IsOptional()
  @IsString()
  codigoOrden?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
