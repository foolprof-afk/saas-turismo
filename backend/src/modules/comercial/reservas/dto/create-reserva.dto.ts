import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
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

  @IsDateString()
  fechaServicioFin: string;

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
