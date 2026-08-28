import { IsOptional, IsString } from 'class-validator';

export class ScanCheckinDto {
  @IsString()
  token: string;

  // Permite desambiguar cuando la reserva tiene varios servicios el mismo día.
  @IsOptional()
  @IsString()
  itinerarioServicioId?: string;
}

export class ManualCheckinDto {
  @IsString()
  codigoReserva: string;

  @IsOptional()
  @IsString()
  itinerarioServicioId?: string;
}
