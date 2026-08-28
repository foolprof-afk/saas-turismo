import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

enum TipoPasajeroDto {
  ADULTO = 'ADULTO',
  NINO = 'NINO',
  INFANTE = 'INFANTE',
}

class PasajeroDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsEnum(TipoPasajeroDto)
  tipo: TipoPasajeroDto;

  @IsOptional()
  @IsString()
  nacionalidad?: string;
}

export class CreateReservaDto {
  @IsString()
  clienteId: string;

  @IsDateString()
  fechaServicioInicio: string;

  // Opcional: si no se especifica, se usa la misma fecha de inicio (reserva de un solo día).
  @IsOptional()
  @IsDateString()
  fechaServicioFin?: string;

  // Hora del tour/traslado (HH:mm). Un mismo servicio puede tener varios horarios;
  // si se necesitan horas distintas por día, usar una plantilla de itinerario.
  @IsOptional()
  @IsString()
  horaServicio?: string;

  // Precio final que se le está liquidando al cliente. Si no se especifica,
  // se calcula automáticamente a partir de la plantilla de itinerario (si existe).
  @IsOptional()
  @IsNumber()
  precioLiquidado?: number;

  @IsString()
  monedaId: string;

  @IsString()
  formaPagoId: string;

  // Si viene, se clona la plantilla hacia un itinerario real (ver reservas.service.ts).
  // Si no viene, se espera que el itinerario se arme servicio por servicio luego (fuera de alcance MVP).
  @IsOptional()
  @IsString()
  plantillaItinerarioId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PasajeroDto)
  pasajeros: PasajeroDto[];
}
