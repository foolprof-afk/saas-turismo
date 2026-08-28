import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateReservaDto } from './dto/create-reserva.dto';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
  ) {}

  findAll(agenciaId: string, skip = 0, take = 20) {
    return this.prisma.reserva.findMany({
      where: { agenciaId },
      include: { cliente: true, vendedor: true, voucher: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(agenciaId: string, id: string) {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id, agenciaId },
      include: {
        cliente: true,
        vendedor: true,
        pasajeros: true,
        voucher: true,
        itinerario: { include: { dias: { include: { servicios: { include: { servicio: true } } } } } },
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return reserva;
  }

  private generarCodigoReserva(): string {
    return `RES-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Crea la reserva y, si se especifica plantillaItinerarioId, clona la plantilla
   * (días + servicios) hacia un Itinerario real "congelado" con fechas concretas.
   * Todo ocurre en una transacción para garantizar atomicidad (ver arquitectura-backend.md).
   */
  async create(agenciaId: string, vendedorId: string, dto: CreateReservaDto) {
    const fechaInicio = new Date(dto.fechaServicioInicio);
    const fechaFin = new Date(dto.fechaServicioFin);

    if (fechaFin < fechaInicio) {
      throw new BadRequestException('fechaServicioFin no puede ser anterior a fechaServicioInicio');
    }

    let plantilla = null;
    if (dto.plantillaItinerarioId) {
      plantilla = await this.prisma.plantillaItinerario.findFirst({
        where: { id: dto.plantillaItinerarioId, agenciaId },
        include: { dias: { include: { servicios: { include: { servicio: true } } }, orderBy: { numeroDia: 'asc' } } },
      });
      if (!plantilla) throw new NotFoundException('Plantilla de itinerario no encontrada');
    }

    const total = plantilla
      ? plantilla.dias.reduce(
          (acc, dia) => acc + dia.servicios.reduce((s, item) => s + Number(item.servicio.precioBase), 0),
          0,
        ) * dto.pasajeros.length
      : 0;

    const reserva = await this.prisma.$transaction(async (tx) => {
      const nuevaReserva = await tx.reserva.create({
        data: {
          agenciaId,
          clienteId: dto.clienteId,
          vendedorId,
          codigoReserva: this.generarCodigoReserva(),
          fechaServicioInicio: fechaInicio,
          fechaServicioFin: fechaFin,
          total,
          monedaId: dto.monedaId,
          formaPagoId: dto.formaPagoId,
          plantillaItinerarioId: dto.plantillaItinerarioId,
          pasajeros: { create: dto.pasajeros },
        },
      });

      if (plantilla) {
        await tx.itinerario.create({
          data: {
            reservaId: nuevaReserva.id,
            dias: {
              create: plantilla.dias.map((dia) => ({
                numeroDia: dia.numeroDia,
                fecha: new Date(fechaInicio.getTime() + (dia.numeroDia - 1) * MS_POR_DIA),
                servicios: {
                  create: dia.servicios.map((s) => ({
                    servicioId: s.servicioId,
                    horaInicio: s.horaInicio,
                  })),
                },
              })),
            },
          },
        });
      }

      return nuevaReserva;
    });

    const voucher = await this.vouchersService.generar(
      reserva.id,
      agenciaId,
      reserva.codigoReserva,
      fechaFin,
    );

    return this.findOne(agenciaId, reserva.id);
  }

  async cancelar(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.reserva.update({ where: { id }, data: { estado: 'CANCELADA' } });
  }
}
