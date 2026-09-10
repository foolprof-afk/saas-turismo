import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Filtros de búsqueda de cotizaciones (usados en GET /cotizaciones) más paginación, todo en
 * un solo DTO, igual que FiltrosReservaDto (ver ese archivo para el motivo).
 */
export class FiltrosCotizacionDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDIENTE', 'CONFIRMADA', 'CANCELADA'])
  estado?: string;

  @IsOptional()
  @IsString()
  codigoCotizacion?: string;

  @IsOptional()
  @IsString()
  vendedorId?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

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
