import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { ConfirmarReservaDto } from './dto/confirmar-reserva.dto';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface FiltrosReserva {
  estado?: string;
  codigoReserva?: string;
  vendedorId?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
  ) {}

  /**
   * Si se especifica codigoReserva, se filtra únicamente por el código de la reserva
   * (búsqueda parcial) y se ignoran el resto de filtros, incluidas las fechas.
   */
  private construirWhere(agenciaId: string, filtros: FiltrosReserva = {}): Prisma.ReservaWhereInput {
    if (filtros.codigoReserva) {
      return { agenciaId, codigoReserva: { contains: filtros.codigoReserva, mode: 'insensitive' } };
    }

    const where: Prisma.ReservaWhereInput = { agenciaId };
    if (filtros.estado) where.estado = filtros.estado as Prisma.EnumEstadoReservaFilter['equals'];
    if (filtros.vendedorId) where.vendedorId = filtros.vendedorId;
    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fechaServicioInicio = {
        ...(filtros.fechaInicio ? { gte: new Date(filtros.fechaInicio) } : {}),
        ...(filtros.fechaFin ? { lte: new Date(filtros.fechaFin) } : {}),
      };
    }
    return where;
  }

  findAll(agenciaId: string, skip = 0, take = 20, filtros: FiltrosReserva = {}) {
    return this.prisma.reserva.findMany({
      where: this.construirWhere(agenciaId, filtros),
      include: { cliente: true, vendedor: true, voucher: true, pasajeros: { take: 1 } },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cuadre de caja: listado + totales por vendedor y por moneda, para liquidaciones diarias
   * o por rango de fechas. Los totales se agrupan por moneda porque sumar montos de distintas
   * monedas en un solo número no refleja el dinero real disponible en caja.
   */
  async cuadre(agenciaId: string, filtros: FiltrosReserva = {}) {
    const reservas = await this.prisma.reserva.findMany({
      where: this.construirWhere(agenciaId, filtros),
      include: { cliente: true, vendedor: true, formaPago: true, pagos: true, moneda: true },
      orderBy: { fechaServicioInicio: 'asc' },
    });

    const porVendedorMoneda = new Map<
      string,
      {
        vendedorId: string;
        vendedorNombre: string;
        monedaId: string;
        monedaCodigo: string;
        monedaSimbolo: string;
        total: number;
        cantidad: number;
      }
    >();
    const porMoneda = new Map<
      string,
      { monedaId: string; monedaCodigo: string; monedaSimbolo: string; total: number; cantidad: number }
    >();

    for (const reserva of reservas) {
      const monto = Number(reserva.total);

      const claveVendedorMoneda = `${reserva.vendedorId}:${reserva.monedaId}`;
      const entryVendedor = porVendedorMoneda.get(claveVendedorMoneda) ?? {
        vendedorId: reserva.vendedorId,
        vendedorNombre: reserva.vendedor.nombre,
        monedaId: reserva.monedaId,
        monedaCodigo: reserva.moneda.codigo,
        monedaSimbolo: reserva.moneda.simbolo,
        total: 0,
        cantidad: 0,
      };
      entryVendedor.total += monto;
      entryVendedor.cantidad += 1;
      porVendedorMoneda.set(claveVendedorMoneda, entryVendedor);

      const entryMoneda = porMoneda.get(reserva.monedaId) ?? {
        monedaId: reserva.monedaId,
        monedaCodigo: reserva.moneda.codigo,
        monedaSimbolo: reserva.moneda.simbolo,
        total: 0,
        cantidad: 0,
      };
      entryMoneda.total += monto;
      entryMoneda.cantidad += 1;
      porMoneda.set(reserva.monedaId, entryMoneda);
    }

    return {
      reservas,
      porMoneda: Array.from(porMoneda.values()),
      porVendedor: Array.from(porVendedorMoneda.values()),
    };
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
  /**
   * Cliente = identidad comercial bajo la cual vende el usuario logueado (no se elige a mano,
   * ver arquitectura-backend.md). Si el usuario aún no tiene un Cliente vinculado, se crea uno
   * automáticamente usando su nombre.
   */
  private async resolverClientePropio(agenciaId: string, vendedorId: string) {
    const existente = await this.prisma.cliente.findUnique({ where: { usuarioId: vendedorId } });
    if (existente) return existente;

    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: vendedorId } });
    return this.prisma.cliente.create({
      data: { agenciaId, usuarioId: vendedorId, nombre: usuario.nombre },
    });
  }

  async create(agenciaId: string, vendedorId: string, dto: CreateReservaDto) {
    if (!dto.servicioId && !dto.plantillaItinerarioId) {
      throw new BadRequestException('Debes seleccionar un servicio o una plantilla de itinerario');
    }
    if (dto.servicioId && dto.plantillaItinerarioId) {
      throw new BadRequestException('Selecciona solo un servicio o una plantilla, no ambos');
    }

    const fechaInicio = new Date(dto.fechaServicioInicio);
    const fechaFin = dto.fechaServicioFin ? new Date(dto.fechaServicioFin) : fechaInicio;

    if (fechaFin < fechaInicio) {
      throw new BadRequestException('fechaServicioFin no puede ser anterior a fechaServicioInicio');
    }

    let plantilla = null;
    let servicio = null;
    let precioEstablecido = 0;

    if (dto.plantillaItinerarioId) {
      plantilla = await this.prisma.plantillaItinerario.findFirst({
        where: { id: dto.plantillaItinerarioId, agenciaId },
        include: { dias: { include: { servicios: { include: { servicio: true } } }, orderBy: { numeroDia: 'asc' } } },
      });
      if (!plantilla) throw new NotFoundException('Plantilla de itinerario no encontrada');
      precioEstablecido =
        plantilla.dias.reduce(
          (acc, dia) => acc + dia.servicios.reduce((s, item) => s + Number(item.servicio.precioBase), 0),
          0,
        ) * dto.pasajeros.length;
    } else {
      servicio = await this.prisma.servicio.findFirst({ where: { id: dto.servicioId, agenciaId } });
      if (!servicio) throw new NotFoundException('Servicio no encontrado');
      precioEstablecido = Number(servicio.precioBase) * dto.pasajeros.length;
    }

    // El precio se puede subir (el agente gana más), pero nunca bajar del precio establecido
    // por el dueño de la agencia madre en el servicio/plantilla.
    if (dto.precioLiquidado !== undefined && dto.precioLiquidado < precioEstablecido) {
      throw new BadRequestException(
        `El precio a liquidar no puede ser menor al precio establecido (${precioEstablecido})`,
      );
    }
    const total = dto.precioLiquidado ?? precioEstablecido;

    const cliente = await this.resolverClientePropio(agenciaId, vendedorId);

    const reserva = await this.prisma.$transaction(async (tx) => {
      const nuevaReserva = await tx.reserva.create({
        data: {
          agenciaId,
          clienteId: cliente.id,
          vendedorId,
          codigoReserva: this.generarCodigoReserva(),
          fechaServicioInicio: fechaInicio,
          fechaServicioFin: fechaFin,
          horaServicio: dto.horaServicio,
          total,
          monedaId: dto.monedaId,
          formaPagoId: dto.formaPagoId,
          plantillaItinerarioId: dto.plantillaItinerarioId,
          servicioId: dto.servicioId,
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
      } else if (servicio) {
        await tx.itinerario.create({
          data: {
            reservaId: nuevaReserva.id,
            dias: {
              create: [
                {
                  numeroDia: 1,
                  fecha: fechaInicio,
                  servicios: {
                    create: [{ servicioId: servicio.id, horaInicio: dto.horaServicio ?? '00:00' }],
                  },
                },
              ],
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

  /**
   * Confirma una reserva registrando el pago. Los requisitos (número/referencia de pago y
   * foto de comprobante) dependen de cómo esté configurada la forma de pago elegida
   * (FormaPago.config: { requiereReferencia, requiereComprobante }), ya que algunos clientes
   * tienen crédito o pagan en efectivo y no siempre hay un comprobante digital que adjuntar.
   */
  async confirmar(agenciaId: string, id: string, dto: ConfirmarReservaDto) {
    const reserva = await this.prisma.reserva.findFirst({ where: { id, agenciaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede confirmar una reserva cancelada');
    }

    const formaPago = await this.prisma.formaPago.findFirst({
      where: { id: dto.formaPagoId, agenciaId },
    });
    if (!formaPago) throw new NotFoundException('Forma de pago no encontrada');

    const config = (formaPago.config as { requiereReferencia?: boolean; requiereComprobante?: boolean }) ?? {};
    const requiereReferencia = config.requiereReferencia ?? true;
    const requiereComprobante = config.requiereComprobante ?? false;

    if (requiereReferencia && !dto.referenciaExterna) {
      throw new BadRequestException(
        `El número de pago es obligatorio para la forma de pago "${formaPago.nombre}"`,
      );
    }
    if (requiereComprobante && !dto.comprobanteUrl) {
      throw new BadRequestException(
        `La foto del comprobante es obligatoria para la forma de pago "${formaPago.nombre}"`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          reservaId: id,
          formaPagoId: dto.formaPagoId,
          monto: dto.monto ?? reserva.total,
          monedaId: reserva.monedaId,
          referenciaExterna: dto.referenciaExterna,
          comprobanteUrl: dto.comprobanteUrl,
          estado: 'PAGADO',
        },
      }),
      this.prisma.reserva.update({ where: { id }, data: { estado: 'CONFIRMADA' } }),
    ]);

    return this.findOne(agenciaId, id);
  }
}
