import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// Servicio incluido en la cotización. La cantidad a facturar es siempre cantidadPersonas
// (ver CreateCotizacionDto), no hay cantidad independiente por línea.
export class CotizacionItemDto {
  @IsString()
  servicioId: string;
}

export class CreateCotizacionDto {
  @IsInt()
  @Min(1)
  cantidadPersonas: number;

  // Persona a cuyo nombre se hace la cotización (no una lista completa de pasajeros, a
  // diferencia de una reserva).
  @IsString()
  pasajeroResponsable: string;

  @IsOptional()
  @IsString()
  documentoResponsable?: string;

  @IsOptional()
  @IsString()
  telefonoResponsable?: string;

  @IsDateString()
  fechaServicio: string;

  @IsOptional()
  @IsString()
  notas?: string;

  // Lista de precios a aplicar sobre el precioBase de cada servicio. Debe estar entre las
  // que el usuario tiene acceso (ver ListasPrecioService.misListas).
  @IsOptional()
  @IsString()
  listaPrecioId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CotizacionItemDto)
  items: CotizacionItemDto[];
}
