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

export class UpdateOrdenServicioItemDto {
  // Id del item existente (ver OrdenServicioItem); si no se envía, se crea una línea nueva.
  // Se usa para que OrdenesServicioService.actualizar pueda detectar qué líneas se agregaron,
  // quitaron o modificaron y así armar el historial de cambios.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  servicioId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsDateString()
  fechaServicio: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCosto?: number;
}

/**
 * Modifica una orden de servicio ya emitida: reemplaza por completo sus líneas (permite
 * agregar, quitar o cambiar cantidad/fecha/precio de cada servicio) y las notas. No permite
 * cambiar el proveedor de la orden. Cada cambio queda registrado en OrdenServicioHistorial
 * (ver OrdenesServicioService.actualizar) para uso interno; el documento impreso/descargado
 * nunca muestra este historial, solo el estado actual de la orden.
 */
export class UpdateOrdenServicioDto {
  @IsOptional()
  @IsString()
  notas?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateOrdenServicioItemDto)
  items: UpdateOrdenServicioItemDto[];
}
