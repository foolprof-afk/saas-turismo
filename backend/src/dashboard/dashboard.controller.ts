import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('comercial')
  comercial(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.comercial(user.agenciaId);
  }

  @Get('operacion')
  operacion(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.operacion(user.agenciaId);
  }

  @Get('finanzas')
  finanzas(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.finanzas(user.agenciaId);
  }
}
