import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrdenServicioItemDto {
  @IsString()
  servicioId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  // Sobreescribe el precioCosto del servicio para esta orden puntual. Si no se envía, se usa
  // Servicio.precioCosto (ver OrdenesServicioService.construirItems); si el servicio tampoco
  // tiene uno definido, la creación falla pidiendo que se indique a mano.
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCosto?: number;
}

/**
 * Crea una orden de servicio (documento de compra hacia un proveedor). Todos los items deben
 * pertenecer al proveedor indicado (ver OrdenesServicioService.construirItems).
 */
export class CreateOrdenServicioDto {
  @IsString()
  proveedorId: string;

  // Fecha en la que el proveedor debe ejecutar el/los servicio(s).
  @IsDateString()
  fechaServicio: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrdenServicioItemDto)
  items: OrdenServicioItemDto[];
}
