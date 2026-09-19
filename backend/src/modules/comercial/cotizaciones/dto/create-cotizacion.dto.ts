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

// Servicio incluido en la cotización. La cantidad a facturar es siempre cantidadPersonas
// (ver CreateCotizacionDto), no hay cantidad independiente por línea.
export class CotizacionItemDto {
  @IsString()
  servicioId: string;

  // Día del itinerario (1 = fechaServicio, 2 = fechaServicio + 1 día, etc.) para poder
  // organizar cotizaciones de varios días con uno o más servicios por día.
  @IsOptional()
  @IsInt()
  @Min(1)
  dia?: number;

  // Precio manual para esta línea, en la moneda del servicio. Si se envía, sobreescribe el
  // precioBase * factor de lista de precios calculado por defecto (ver construirItems).
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;
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

  // Moneda en la que se presenta la cotización al cliente. Si difiere de la moneda de un
  // servicio, se convierte automáticamente usando la tasaCambio de ambas monedas (ver
  // CotizacionesService.convertirMonto).
  @IsOptional()
  @IsString()
  monedaId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CotizacionItemDto)
  items: CotizacionItemDto[];
}
