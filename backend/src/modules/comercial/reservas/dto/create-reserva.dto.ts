import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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

  // Marca al responsable/titular del grupo. Si ningún pasajero lo indica, se asume
  // responsable al primero de la lista (ver ReservasService.create).
  @IsOptional()
  @IsBoolean()
  esResponsable?: boolean;
}

// Línea de servicio para reservas de tipo "múltiple": cada una puede tener su propia
// fecha/hora (no necesariamente el mismo día) y su propio precio, en la moneda del servicio.
class ServicioReservaDto {
  @IsString()
  servicioId: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  horaInicio?: string;

  // Precio a liquidar para esta línea. Si no se especifica, se usa el precioBase del servicio.
  @IsOptional()
  @IsNumber()
  precio?: number;
}

export class CreateReservaDto {
  // Requerido para reservas de tipo "servicio" o "plantilla". Para "múltiple" se ignora:
  // la fecha/rango de la reserva se calcula a partir de las fechas de cada línea.
  @IsOptional()
  @IsDateString()
  fechaServicioInicio?: string;

  // Opcional: si no se especifica, se usa la misma fecha de inicio (reserva de un solo día).
  @IsOptional()
  @IsDateString()
  fechaServicioFin?: string;

  // Hora del tour/traslado (HH:mm). Solo aplica a reservas de "servicio" individual;
  // para "múltiple" cada línea tiene su propia hora.
  @IsOptional()
  @IsString()
  horaServicio?: string;

  // Precio final que se le está liquidando al cliente. Si no se especifica,
  // se calcula automáticamente a partir de la plantilla de itinerario (si existe).
  // No aplica a reservas "múltiple" (el precio vive por línea en serviciosMultiples).
  @IsOptional()
  @IsNumber()
  precioLiquidado?: number;

  // Requerido para "servicio" y "plantilla". No aplica a "múltiple" (cada línea trae su moneda).
  @IsOptional()
  @IsString()
  monedaId?: string;

  // La forma de pago se elige al confirmar la reserva (ver ConfirmarReservaDto), no al crearla.

  // Se debe indicar exactamente uno de los tres: un servicio individual (tour/traslado puntual),
  // una plantilla de itinerario (paquete de varios días) o una lista de servicios múltiples
  // (combinación libre armada por el vendedor, cada uno con su propia fecha/hora/moneda).
  @IsOptional()
  @IsString()
  plantillaItinerarioId?: string;

  @IsOptional()
  @IsString()
  servicioId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicioReservaDto)
  serviciosMultiples?: ServicioReservaDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PasajeroDto)
  pasajeros: PasajeroDto[];
}
