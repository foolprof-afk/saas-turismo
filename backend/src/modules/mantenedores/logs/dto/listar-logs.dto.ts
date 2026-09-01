import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListarLogsDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOGIN', 'ACCESO', 'CREAR', 'MODIFICAR', 'ELIMINAR'])
  accion?: string;

  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 50;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
