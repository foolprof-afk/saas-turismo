import { IsNotEmpty, IsString } from 'class-validator';

export class RegistrarAccesoDto {
  @IsString()
  @IsNotEmpty()
  modulo: string;
}
