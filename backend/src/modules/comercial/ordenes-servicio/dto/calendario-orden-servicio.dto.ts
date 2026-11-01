import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Filtro de mes/año para GET /ordenes-servicio/calendario. Si no se especifican, el servicio
 * usa el mes/año actual.
 */
export class CalendarioOrdenServicioDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;
}
