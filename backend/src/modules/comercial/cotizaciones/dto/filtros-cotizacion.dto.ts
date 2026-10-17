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

  // Búsqueda libre por código de cotización, nombre del pasajero responsable o teléfono (ver
  // CotizacionesService.construirWhere).
  @IsOptional()
  @IsString()
  q?: string;

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

  // Columna por la que se ordena el listado (ver CotizacionesService.findAll). 'fecha' ordena
  // por fechaServicio (fecha de viaje/servicio, no la fecha de creación de la cotización).
  @IsOptional()
  @IsString()
  @IsIn(['fecha', 'nombre'])
  sortBy?: 'fecha' | 'nombre';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

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
