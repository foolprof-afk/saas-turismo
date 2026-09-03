import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { LogsService } from './logs.service';
import { ListarLogsDto } from './dto/listar-logs.dto';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  // Solo admin puede consultar el historial de auditoria.
  @Get()
  @Roles('admin')
  listar(@CurrentUser() user: AuthenticatedUser, @Query() filtros: ListarLogsDto) {
    return this.logsService.listar(user.agenciaId, filtros);
  }
}
