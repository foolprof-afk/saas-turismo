import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class PlantillaServicioItemDto {
  @IsString()
  servicioId: string;

  @IsString()
  horaInicio: string; // "HH:mm"

  @IsInt()
  @Min(0)
  orden: number;
}

class PlantillaDiaItemDto {
  @IsInt()
  @Min(1)
  numeroDia: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantillaServicioItemDto)
  servicios: PlantillaServicioItemDto[];
}

export class CreatePlantillaDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Min(1)
  diasTotales: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlantillaDiaItemDto)
  dias: PlantillaDiaItemDto[];
}
