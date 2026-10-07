import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

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

  // Foto principal para el catálogo público (Front Office). Opcional mientras se prepara la
  // publicación del servicio.
  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;

  // Visibilidad en el catálogo público (Front Office), independiente de `estado` (que controla
  // el uso interno del servicio en el Back Office). Por defecto PRIVADO (ver schema.prisma).
  @IsOptional()
  @IsIn(['PUBLICO', 'PRIVADO'])
  estadoPublicacion?: 'PUBLICO' | 'PRIVADO';

  // Lista completa de IDs de servicios asociados/opcionales, en el orden en que deben mostrarse
  // (ej. bajo "También puedes agregar" en el Front Office). Al enviarse, reemplaza por completo
  // la lista de asociaciones existentes de este servicio (no hace merge incremental).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  asociadoIds?: string[];
}
