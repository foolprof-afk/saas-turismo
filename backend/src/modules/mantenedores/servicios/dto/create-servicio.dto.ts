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
