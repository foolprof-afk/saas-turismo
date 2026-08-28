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

  // Se debe indicar exactamente uno de los dos: un servicio individual (tour/traslado puntual)
  // o una plantilla de itinerario (paquete de varios días). Ambos generan un Itinerario real.
  @IsOptional()
  @IsString()
  plantillaItinerarioId?: string;

  @IsOptional()
  @IsString()
  servicioId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PasajeroDto)
  pasajeros: PasajeroDto[];
}
