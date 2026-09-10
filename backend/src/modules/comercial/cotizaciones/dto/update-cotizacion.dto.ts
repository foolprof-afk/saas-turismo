import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CotizacionItemDto } from './create-cotizacion.dto';

/**
 * Actualiza los datos de una cotización ya creada. Solo se permite mientras está PENDIENTE
 * (ver CotizacionesService.actualizar): una vez confirmada ya generó una reserva real.
 */
export class UpdateCotizacionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidadPersonas?: number;

  @IsOptional()
  @IsString()
  pasajeroResponsable?: string;

  @IsOptional()
  @IsString()
  documentoResponsable?: string;

  @IsOptional()
  @IsString()
  telefonoResponsable?: string;

  @IsOptional()
  @IsDateString()
  fechaServicio?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  // Enviar cadena vacía o null para quitar la lista de precios asignada.
  @IsOptional()
  @IsString()
  listaPrecioId?: string;

  // Si se envía, reemplaza por completo los servicios de la cotización.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CotizacionItemDto)
  items?: CotizacionItemDto[];
}
