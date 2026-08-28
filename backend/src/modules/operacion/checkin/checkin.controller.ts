import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CheckinService } from './checkin.service';
import { ScanCheckinDto, ManualCheckinDto } from './dto/checkin.dto';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'operacion')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('scan')
  scan(@CurrentUser() user: AuthenticatedUser, @Body() dto: ScanCheckinDto) {
    return this.checkinService.scan(dto.token, user.userId, dto.itinerarioServicioId);
  }

  @Post('manual')
  manual(@CurrentUser() user: AuthenticatedUser, @Body() dto: ManualCheckinDto) {
    return this.checkinService.manual(user.agenciaId, dto.codigoReserva, user.userId, dto.itinerarioServicioId);
  }
}
