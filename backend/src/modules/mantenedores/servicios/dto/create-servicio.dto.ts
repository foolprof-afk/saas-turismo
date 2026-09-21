import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateServicioDto {
  @IsString()
  proveedorId: string;

  @IsString()
  tipoServicioId: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidadMax?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionMin?: number;

  @IsNumber()
  precioBase: number;

  // Precio que se le paga al proveedor por este servicio (opcional). Se usa como valor por
  // defecto al generar una orden de servicio para ese proveedor.
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioCosto?: number;

  @IsString()
  monedaId: string;

  @IsOptional()
  @IsString()
  rutaId?: string;

  @IsOptional()
  @IsString()
  puntoRecogidaId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impuestoIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palabrasClave?: string[];
}
