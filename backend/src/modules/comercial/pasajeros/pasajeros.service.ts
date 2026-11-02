import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface PasajeroSugerido {
  nombre: string;
  telefono: string | null;
}

/**
 * Autocompletado de pasajeros al crear cotizaciones/reservas: cuando un pasajero ya conocido
 * pide servicios adicionales, el vendedor no tiene que volver a escribir su nombre y teléfono.
 * No existe una tabla única de "pasajero"; se busca en Pasajero (de reservas) y en
 * Cotizacion.pasajeroResponsable (las cotizaciones no crean Pasajero hasta confirmarse), y se
 * combinan por nombre, priorizando el registro más reciente que tenga teléfono.
 */
@Injectable()
export class PasajerosService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(agenciaId: string, q: string | undefined): Promise<PasajeroSugerido[]> {
    const texto = q?.trim();
    if (!texto || texto.length < 2) return [];

    const [pasajeros, cotizaciones] = await Promise.all([
      this.prisma.pasajero.findMany({
        where: { nombre: { contains: texto, mode: 'insensitive' }, reserva: { agenciaId } },
        select: { nombre: true, telefono: true, reserva: { select: { createdAt: true } } },
        orderBy: { reserva: { createdAt: 'desc' } },
        take: 20,
      }),
      this.prisma.cotizacion.findMany({
        where: { agenciaId, pasajeroResponsable: { contains: texto, mode: 'insensitive' } },
        select: { pasajeroResponsable: true, telefonoResponsable: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const resultados = new Map<string, PasajeroSugerido>();
    for (const p of pasajeros) {
      const clave = p.nombre.trim().toLowerCase();
      const actual = resultados.get(clave);
      if (!actual || (!actual.telefono && p.telefono)) {
        resultados.set(clave, { nombre: p.nombre, telefono: p.telefono });
      }
    }
    for (const c of cotizaciones) {
      const clave = c.pasajeroResponsable.trim().toLowerCase();
      const actual = resultados.get(clave);
      if (!actual || (!actual.telefono && c.telefonoResponsable)) {
        resultados.set(clave, { nombre: c.pasajeroResponsable, telefono: c.telefonoResponsable });
      }
    }

    return Array.from(resultados.values()).slice(0, 10);
  }
}
