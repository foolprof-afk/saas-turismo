import { IsEmail, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export interface PermisoAccion {
  leer?: boolean;
  escribir?: boolean;
  eliminar?: boolean;
}

export class CreateUsuarioDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  rolId: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsObject()
  permisos?: Record<string, PermisoAccion>;
}
