import { Module } from '@nestjs/common';
import { AgenciasModule } from './agencias/agencias.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ServiciosModule } from './servicios/servicios.module';
import { TiposServicioModule } from './tipos-servicio/tipos-servicio.module';
import { PlantillasItinerarioModule } from './plantillas-itinerario/plantillas-itinerario.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { GuiasModule } from './guias/guias.module';
import { RutasModule } from './rutas/rutas.module';
import { PuntosRecogidaModule } from './puntos-recogida/puntos-recogida.module';
import { MonedasModule } from './monedas/monedas.module';
import { ImpuestosModule } from './impuestos/impuestos.module';
import { FormasPagoModule } from './formas-pago/formas-pago.module';

@Module({
  imports: [
    AgenciasModule,
    UsuariosModule,
    ProveedoresModule,
    ServiciosModule,
    TiposServicioModule,
    PlantillasItinerarioModule,
    VehiculosModule,
    GuiasModule,
    RutasModule,
    PuntosRecogidaModule,
    MonedasModule,
    ImpuestosModule,
    FormasPagoModule,
  ],
})
export class MantenedoresModule {}
