import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MantenedoresModule } from './modules/mantenedores/mantenedores.module';
import { ComercialModule } from './modules/comercial/comercial.module';
import { OperacionModule } from './modules/operacion/operacion.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MantenedoresModule,
    ComercialModule,
    OperacionModule,
    FinanzasModule,
    DashboardModule,
  ],
})
export class AppModule {}
