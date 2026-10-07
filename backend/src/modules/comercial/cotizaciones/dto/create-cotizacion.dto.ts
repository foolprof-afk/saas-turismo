import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// Servicio incluido en la cotización.
export class CotizacionItemDto {
  @IsString()
  servicioId: string;

  // Fecha calendario en la que se presta este servicio. Si no se envía, se usa
  // CreateCotizacionDto.fechaServicio (o la fechaServicio ya guardada, al actualizar). Permite
  // itinerarios con fechas salteadas (ej. un traslado el 1-oct y otro el 3-oct, sin nada el
  // día 2), que es justo lo que no se podía representar con un número de día relativo.
  @IsOptional()
  @IsDateString()
  fecha?: string;

  // Precio manual para esta línea, en la moneda del servicio. Si se envía, sobreescribe el
  // precioBase * factor de lista de precios calculado por defecto (ver construirItems).
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  // Cantidad de pasajeros a facturar en esta línea. Si no se envía, toma el valor de
  // CreateCotizacionDto.cantidadPersonas (ver construirItems). Permite que servicios distintos
  // de una misma cotización se coticen para grupos de tamaño distinto (ej. un traslado solo
  // para 2 de los 4 pasajeros).
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;
}

export class CreateCotizacionDto {
  @IsInt()
  @Min(1)
  cantidadPersonas: number;

  // Persona a cuyo nombre se hace la cotización (no una lista completa de pasajeros, a
  // diferencia de una reserva).
  @IsString()
  pasajeroResponsable: string;

  // Fecha en que inicia la ejecución del servicio. Se usa como fecha por defecto para los
  // items que no envían su propia "fecha" (ver CotizacionItemDto.fecha).
  @IsDateString()
  fechaServicio: string;

  @IsOptional()
  @IsString()
  documentoResponsable?: string;

  @IsOptional()
  @IsString()
  telefonoResponsable?: string;

  // Requerido por el flujo del Front Office (Guatetur) para poder enviar la cotización generada
  // por "Solicitar mi viaje"; opcional en el Back Office tradicional (ver CotizacionesController).
  @IsOptional()
  @IsEmail()
  emailResponsable?: string;

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
