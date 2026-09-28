import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { obtenerProvider, PROVEEDORES_PASARELA_PAGO } from './providers/registry';

const PATRON_CAMPO_SENSIBLE = /secret|key|token|password/i;

/**
 * Mantenedor de pasarelas de pago (Recurrente y, a futuro, otras). Cada pasarela lleva
 * asociada una FormaPago creada automáticamente (ver create), usada para registrar los pagos
 * que confirma el webhook del proveedor sin depender de que el usuario elija una forma de pago
 * a mano.
 */
@Injectable()
export class PasarelasPagoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Enmascara valores de config cuyo nombre de campo sugiere que es un dato sensible. */
  private enmascarar<T extends { config: unknown }>(pasarela: T): T {
    const config = (pasarela.config as Record<string, unknown>) ?? {};
    const configEnmascarado: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      if (PATRON_CAMPO_SENSIBLE.test(key) && typeof value === 'string' && value) {
        configEnmascarado[key] = '•'.repeat(Math.min(value.length, 12));
      } else {
        configEnmascarado[key] = value;
      }
    }
    return { ...pasarela, config: configEnmascarado };
  }

  async findAll(agenciaId: string) {
    const pasarelas = await this.prisma.pasarelaPago.findMany({ where: { agenciaId }, orderBy: { createdAt: 'desc' } });
    return pasarelas.map((p) => this.enmascarar(p));
  }

  async findOne(agenciaId: string, id: string) {
    const pasarela = await this.prisma.pasarelaPago.findFirst({ where: { id, agenciaId } });
    if (!pasarela) throw new NotFoundException('Pasarela de pago no encontrada');
    return this.enmascarar(pasarela);
  }

  /** Proveedores disponibles para elegir en el mantenedor, con sus campos de config esperados. */
  listarProveedoresDisponibles() {
    return Object.entries(PROVEEDORES_PASARELA_PAGO).map(([id, provider]) => ({
      id,
      camposConfigRequeridos: provider.camposConfigRequeridos,
      monedasSoportadas: provider.monedasSoportadas,
    }));
  }

  async create(
    agenciaId: string,
    data: { proveedor: string; nombre: string; urlBase?: string; activo?: boolean; config?: Record<string, unknown> },
  ) {
    const provider = obtenerProvider(data.proveedor);
    if (!provider) throw new BadRequestException(`Proveedor de pasarela de pago desconocido: ${data.proveedor}`);
    const config = data.config ?? {};
    const faltantes = provider.camposConfigRequeridos.filter((campo) => !config[campo]);
    if (faltantes.length > 0) {
      throw new BadRequestException(`Faltan datos de configuración para ${data.proveedor}: ${faltantes.join(', ')}`);
    }

    const pasarela = await this.prisma.$transaction(async (tx) => {
      const formaPago = await tx.formaPago.create({
        data: { agenciaId, nombre: `Pasarela: ${data.nombre}`, config: {} },
      });
      return tx.pasarelaPago.create({
        data: {
          agenciaId,
          proveedor: data.proveedor,
          nombre: data.nombre,
          urlBase: data.urlBase,
          activo: data.activo ?? true,
          config: config as Prisma.InputJsonValue,
          formaPagoId: formaPago.id,
        },
      });
    });
    return this.enmascarar(pasarela);
  }

  async update(
    agenciaId: string,
    id: string,
    data: { nombre?: string; urlBase?: string; activo?: boolean; config?: Record<string, unknown> },
  ) {
    const existente = await this.prisma.pasarelaPago.findFirst({ where: { id, agenciaId } });
    if (!existente) throw new NotFoundException('Pasarela de pago no encontrada');

    // Los campos de config vacíos en el payload no sobreescriben el valor guardado (así el
    // formulario puede dejar en blanco los campos sensibles sin borrarlos accidentalmente).
    const configPrevio = (existente.config as Record<string, unknown>) ?? {};
    const configNuevo = { ...configPrevio };
    for (const [key, value] of Object.entries(data.config ?? {})) {
      if (value !== '' && value !== undefined && value !== null) configNuevo[key] = value;
    }

    const pasarela = await this.prisma.$transaction(async (tx) => {
      if (data.nombre && data.nombre !== existente.nombre) {
        await tx.formaPago.update({
          where: { id: existente.formaPagoId },
          data: { nombre: `Pasarela: ${data.nombre}` },
        });
      }
      return tx.pasarelaPago.update({
        where: { id },
        data: {
          nombre: data.nombre ?? existente.nombre,
          urlBase: data.urlBase ?? existente.urlBase,
          activo: data.activo ?? existente.activo,
          config: configNuevo as Prisma.InputJsonValue,
        },
      });
    });
    return this.enmascarar(pasarela);
  }

  async remove(agenciaId: string, id: string) {
    const existente = await this.prisma.pasarelaPago.findFirst({ where: { id, agenciaId } });
    if (!existente) throw new NotFoundException('Pasarela de pago no encontrada');
    const linksActivos = await this.prisma.linkPago.count({ where: { pasarelaPagoId: id, estado: 'PENDIENTE' } });
    if (linksActivos > 0) {
      throw new BadRequestException('No se puede eliminar: hay links de pago pendientes generados con esta pasarela');
    }
    await this.prisma.pasarelaPago.delete({ where: { id } });
    return { success: true };
  }
}
