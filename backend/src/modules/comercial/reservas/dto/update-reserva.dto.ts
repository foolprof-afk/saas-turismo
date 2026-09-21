import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PasajeroDto, ServicioReservaDto } from './create-reserva.dto';

/**
 * Actualiza los datos de una reserva ya creada. Permitido mientras la reserva está PENDIENTE o
 * CONFIRMADA (ver ReservasService.actualizar): una vez confirmada, ya tiene un pago registrado,
 * así que en ese estado no se puede cambiar precio/moneda/líneas del itinerario (dejaría el
 * pago desalineado), solo fecha, hora y pasajeros. No permite cambiar el "tipo" de reserva
 * (servicio/plantilla/múltiple) ni el servicio o plantilla elegidos: eso es una decisión de
 * creación, no de edición.
 */
export class UpdateReservaDto {
  @IsOptional()
  @IsDateString()
  fechaServicioInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaServicioFin?: string;

  @IsOptional()
  @IsString()
  horaServicio?: string;

  @IsOptional()
  @IsNumber()
  precioLiquidado?: number;

  @IsOptional()
  @IsString()
  monedaId?: string;

  // Solo aplica a reservas de tipo MULTIPLE: reemplaza por completo las líneas del itinerario.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicioReservaDto)
  serviciosMultiples?: ServicioReservaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PasajeroDto)
  pasajeros?: PasajeroDto[];
}
