import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Filtros de búsqueda de reservas (usados en GET /reservas y GET /reservas/cuadre) más
 * paginación, todo en un solo DTO. Deben ir juntos en una sola clase porque el ValidationPipe
 * global usa forbidNonWhitelisted: true: si se mezclara este @Query() con parámetros
 * individuales @Query('x') en el mismo handler, Nest igual valida el objeto completo contra
 * esta clase y rechaza con 400 cualquier query param que no esté declarado aquí.
 */
export class FiltrosReservaDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDIENTE', 'CONFIRMADA', 'OPERADA', 'CANCELADA'])
  estado?: string;

  @IsOptional()
  @IsString()
  codigoReserva?: string;

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
