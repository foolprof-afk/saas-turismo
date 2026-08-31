import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { ConfirmarReservaDto } from './dto/confirmar-reserva.dto';
import { convertirAPrincipal, desglosePorMoneda, MonedaPrincipalInfo } from '../../../common/utils/reserva-montos.util';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const INCLUDE_ITINERARIO_MONTOS = {
  dias: { include: { servicios: { include: { moneda: true } } } },
} as const;

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
   * Si se especifica codigoReserva, se busca por coincidencia parcial y se ignora el rango
   * de fechas (no tiene sentido acotar por fecha una búsqueda por código específico), pero
   * el resto de filtros (estado, vendedor) se siguen aplicando en conjunto.
   */
  private construirWhere(agenciaId: string, filtros: FiltrosReserva = {}): Prisma.ReservaWhereInput {
    const where: Prisma.ReservaWhereInput = { agenciaId };

    if (filtros.codigoReserva) {
      where.codigoReserva = { contains: filtros.codigoReserva, mode: 'insensitive' };
    }
    if (filtros.estado) where.estado = filtros.estado as Prisma.EnumEstadoReservaFilter['equals'];
    if (filtros.vendedorId) where.vendedorId = filtros.vendedorId;
    if (!filtros.codigoReserva && (filtros.fechaInicio || filtros.fechaFin)) {
      where.fechaServicioInicio = {
        ...(filtros.fechaInicio ? { gte: new Date(filtros.fechaInicio) } : {}),
        ...(filtros.fechaFin ? { lte: new Date(filtros.fechaFin) } : {}),
      };
    }
    return where;
  }

  /**
   * Moneda marcada como principal en el mantenedor de monedas: todos los cuadres/pagos se
   * normalizan a esta moneda usando la tasaCambio de cada moneda. Si no hay ninguna marcada
   * como principal, se retorna null y los totales convertidos simplemente no se calculan.
   */
  private async obtenerMonedaPrincipal(agenciaId: string): Promise<MonedaPrincipalInfo | null> {
    const moneda = await this.prisma.moneda.findFirst({ where: { agenciaId, esPrincipal: true } });
    if (!moneda) return null;
    return { id: moneda.id, codigo: moneda.codigo, simbolo: moneda.simbolo, tasaCambio: Number(moneda.tasaCambio) };
  }

  async findAll(agenciaId: string, skip = 0, take = 20, filtros: FiltrosReserva = {}) {
    const [reservas, monedaPrincipal] = await Promise.all([
      this.prisma.reserva.findMany({
        where: this.construirWhere(agenciaId, filtros),
        include: {
          cliente: true,
          vendedor: true,
          voucher: true,
          pasajeros: true,
          moneda: true,
          itinerario: { include: INCLUDE_ITINERARIO_MONTOS },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.obtenerMonedaPrincipal(agenciaId),
    ]);
    return reservas.map((r) => {
      const montos = desglosePorMoneda(r);
      return { ...r, montos, totalPrincipal: convertirAPrincipal(montos, monedaPrincipal) };
    });
  }

  /**
   * Cuadre de caja: listado + totales por vendedor y por moneda, para liquidaciones diarias
   * o por rango de fechas. Los totales se agrupan por moneda porque sumar montos de distintas
   * monedas en un solo número no refleja el dinero real disponible en caja. Las reservas de
   * tipo MULTIPLE aportan un monto por cada línea de servicio (pueden caer en más de una moneda).
   * Adicionalmente se calcula totalGeneral: la suma de todo convertida a la moneda marcada como
   * principal en el mantenedor de monedas (usando la tasaCambio de cada moneda), para tener un
   * único número de referencia sin importar en qué moneda se cobró cada reserva.
   */
  async cuadre(agenciaId: string, filtros: FiltrosReserva = {}) {
    const [reservas, monedaPrincipal] = await Promise.all([
      this.prisma.reserva.findMany({
        where: this.construirWhere(agenciaId, filtros),
        include: {
          cliente: true,
          vendedor: true,
          formaPago: true,
          pagos: true,
          moneda: true,
          itinerario: { include: INCLUDE_ITINERARIO_MONTOS },
        },
        orderBy: { fechaServicioInicio: 'asc' },
      }),
      this.obtenerMonedaPrincipal(agenciaId),
    ]);

    const porVendedorMoneda = new Map<
      string,
      {
        vendedorId: string;
        vendedorNombre: string;
        monedaId: string;
        monedaCodigo: string;
        monedaSimbolo: string;
        tasaCambio: number;
        total: number;
        cantidad: number;
      }
    >();
    const porMoneda = new Map<
      string,
      {
        monedaId: string;
        monedaCodigo: string;
        monedaSimbolo: string;
        tasaCambio: number;
        total: number;
        cantidad: number;
      }
    >();

    for (const reserva of reservas) {
      for (const monto of desglosePorMoneda(reserva)) {
        const claveVendedorMoneda = `${reserva.vendedorId}:${monto.monedaId}`;
        const entryVendedor = porVendedorMoneda.get(claveVendedorMoneda) ?? {
          vendedorId: reserva.vendedorId,
          vendedorNombre: reserva.vendedor.nombre,
          monedaId: monto.monedaId,
          monedaCodigo: monto.monedaCodigo,
          monedaSimbolo: monto.monedaSimbolo,
          tasaCambio: monto.tasaCambio,
          total: 0,
          cantidad: 0,
        };
        entryVendedor.total += monto.total;
        entryVendedor.cantidad += 1;
        porVendedorMoneda.set(claveVendedorMoneda, entryVendedor);

        const entryMoneda = porMoneda.get(monto.monedaId) ?? {
          monedaId: monto.monedaId,
          monedaCodigo: monto.monedaCodigo,
          monedaSimbolo: monto.monedaSimbolo,
          tasaCambio: monto.tasaCambio,
          total: 0,
          cantidad: 0,
        };
        entryMoneda.total += monto.total;
        entryMoneda.cantidad += 1;
        porMoneda.set(monto.monedaId, entryMoneda);
      }
    }

    const porMonedaArr = Array.from(porMoneda.values());

    return {
      reservas,
      monedaPrincipal,
      porMoneda: porMonedaArr,
      porVendedor: Array.from(porVendedorMoneda.values()),
      totalGeneral: convertirAPrincipal(porMonedaArr, monedaPrincipal),
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
        moneda: true,
        itinerario: {
          include: { dias: { include: { servicios: { include: { servicio: true, moneda: true } } } } },
        },
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    const montos = desglosePorMoneda(reserva);
    const monedaPrincipal = await this.obtenerMonedaPrincipal(agenciaId);
    return { ...reserva, montos, totalPrincipal: convertirAPrincipal(montos, monedaPrincipal) };
  }

  private generarCodigoReserva(): string {
    return `RES-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

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

  /**
   * Crea la reserva en uno de tres modos, mutuamente excluyentes:
   * - servicioId: un solo servicio puntual (tour/traslado), un solo día.
   * - plantillaItinerarioId: clona una plantilla (varios días/servicios) con fechas concretas.
   * - serviciosMultiples: combinación libre armada por el vendedor; cada línea puede tener su
   *   propia fecha/hora/precio y usa la moneda del servicio (no hay una moneda única de reserva).
   * Todo ocurre en una transacción para garantizar atomicidad (ver arquitectura-backend.md).
   */
  async create(agenciaId: string, vendedorId: string, dto: CreateReservaDto) {
    const modosProvistos =
      (dto.servicioId ? 1 : 0) +
      (dto.plantillaItinerarioId ? 1 : 0) +
      (dto.serviciosMultiples?.length ? 1 : 0);
    if (modosProvistos !== 1) {
      throw new BadRequestException(
        'Debes elegir exactamente un tipo de reserva: un servicio individual, una plantilla de itinerario o servicios múltiples',
      );
    }

    let plantilla: {
      dias: { numeroDia: number; servicios: { servicioId: string; horaInicio: string }[] }[];
    } | null = null;
    let servicio: { id: string } | null = null;
    let lineasMultiples: {
      servicio: { id: string; nombre: string; monedaId: string };
      fecha: Date;
      horaInicio: string;
      precio: number;
    }[] = [];
    let tipo: 'SERVICIO' | 'PLANTILLA' | 'MULTIPLE' = 'SERVICIO';
    let fechaInicio: Date;
    let fechaFin: Date;
    let total: number | null = null;
    let monedaId: string | null = null;

    if (dto.serviciosMultiples?.length) {
      tipo = 'MULTIPLE';
      for (const linea of dto.serviciosMultiples) {
        const s = await this.prisma.servicio.findFirst({ where: { id: linea.servicioId, agenciaId } });
        if (!s) throw new NotFoundException(`Servicio no encontrado: ${linea.servicioId}`);
        const precioMinimo = Number(s.precioBase);
        const precio = linea.precio ?? precioMinimo;
        if (precio < precioMinimo) {
          throw new BadRequestException(
            `El precio de "${s.nombre}" no puede ser menor al precio establecido (${precioMinimo})`,
          );
        }
        lineasMultiples.push({
          servicio: { id: s.id, nombre: s.nombre, monedaId: s.monedaId },
          fecha: new Date(linea.fecha),
          horaInicio: linea.horaInicio ?? '00:00',
          precio,
        });
      }
      const fechas = lineasMultiples.map((l) => l.fecha.getTime());
      fechaInicio = new Date(Math.min(...fechas));
      fechaFin = new Date(Math.max(...fechas));
    } else {
      if (!dto.fechaServicioInicio) {
        throw new BadRequestException('fechaServicioInicio es obligatoria');
      }
      if (!dto.monedaId) {
        throw new BadRequestException('monedaId es obligatorio');
      }
      fechaInicio = new Date(dto.fechaServicioInicio);
      fechaFin = dto.fechaServicioFin ? new Date(dto.fechaServicioFin) : fechaInicio;
      if (fechaFin < fechaInicio) {
        throw new BadRequestException('fechaServicioFin no puede ser anterior a fechaServicioInicio');
      }

      let precioEstablecido = 0;
      if (dto.plantillaItinerarioId) {
        tipo = 'PLANTILLA';
        const plantillaEncontrada = await this.prisma.plantillaItinerario.findFirst({
          where: { id: dto.plantillaItinerarioId, agenciaId },
          include: {
            dias: { include: { servicios: { include: { servicio: true } } }, orderBy: { numeroDia: 'asc' } },
          },
        });
        if (!plantillaEncontrada) throw new NotFoundException('Plantilla de itinerario no encontrada');
        plantilla = plantillaEncontrada;
        precioEstablecido =
          plantillaEncontrada.dias.reduce(
            (acc, dia) => acc + dia.servicios.reduce((s, item) => s + Number(item.servicio.precioBase), 0),
            0,
          ) * dto.pasajeros.length;
      } else {
        tipo = 'SERVICIO';
        const servicioEncontrado = await this.prisma.servicio.findFirst({
          where: { id: dto.servicioId, agenciaId },
        });
        if (!servicioEncontrado) throw new NotFoundException('Servicio no encontrado');
        servicio = servicioEncontrado;
        precioEstablecido = Number(servicioEncontrado.precioBase) * dto.pasajeros.length;
      }

      if (dto.precioLiquidado !== undefined && dto.precioLiquidado < precioEstablecido) {
        throw new BadRequestException(
          `El precio a liquidar no puede ser menor al precio establecido (${precioEstablecido})`,
        );
      }
      total = dto.precioLiquidado ?? precioEstablecido;
      monedaId = dto.monedaId;
    }

    const cliente = await this.resolverClientePropio(agenciaId, vendedorId);

    // Toda reserva debe tener exactamente un responsable; si el vendedor no marcó a nadie,
    // se asume responsable al primer pasajero de la lista.
    const hayResponsable = dto.pasajeros.some((p) => p.esResponsable);
    const pasajerosData = dto.pasajeros.map((p, i) => ({
      ...p,
      esResponsable: hayResponsable ? Boolean(p.esResponsable) : i === 0,
    }));

    const reserva = await this.prisma.$transaction(async (tx) => {
      const nuevaReserva = await tx.reserva.create({
        data: {
          agenciaId,
          clienteId: cliente.id,
          vendedorId,
          codigoReserva: this.generarCodigoReserva(),
          tipo,
          fechaServicioInicio: fechaInicio,
          fechaServicioFin: fechaFin,
          horaServicio: tipo === 'MULTIPLE' ? undefined : dto.horaServicio,
          total: total ?? undefined,
          monedaId: monedaId ?? undefined,
          plantillaItinerarioId: dto.plantillaItinerarioId,
          servicioId: dto.servicioId,
          pasajeros: { create: pasajerosData },
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
      } else if (lineasMultiples.length > 0) {
        // Un día de itinerario por cada fecha distinta (varias líneas pueden compartir fecha).
        const fechasUnicas = Array.from(new Set(lineasMultiples.map((l) => l.fecha.getTime()))).sort(
          (a, b) => a - b,
        );
        await tx.itinerario.create({
          data: {
            reservaId: nuevaReserva.id,
            dias: {
              create: fechasUnicas.map((fechaTime, idx) => ({
                numeroDia: idx + 1,
                fecha: new Date(fechaTime),
                servicios: {
                  create: lineasMultiples
                    .filter((l) => l.fecha.getTime() === fechaTime)
                    .map((l) => ({
                      servicioId: l.servicio.id,
                      horaInicio: l.horaInicio,
                      precio: l.precio,
                      monedaId: l.servicio.monedaId,
                    })),
                },
              })),
            },
          },
        });
      }

      return nuevaReserva;
    });

    await this.vouchersService.generar(reserva.id, agenciaId, reserva.codigoReserva, fechaFin);

    return this.findOne(agenciaId, reserva.id);
  }

  /**
   * Actualiza fecha, hora, precio, moneda, pasajeros y (en reservas MULTIPLE) las líneas del
   * itinerario. Solo se permite mientras la reserva está PENDIENTE: al confirmar ya queda un
   * Pago asociado a un monto/fecha concretos, así que editar esos datos después dejaría el
   * pago desalineado con la reserva. No permite cambiar el tipo de reserva ni el servicio o
   * plantilla elegidos (eso es una decisión de creación, no de edición).
   */
  async actualizar(agenciaId: string, id: string, dto: UpdateReservaDto) {
    const reserva = await this.prisma.reserva.findFirst({ where: { id, agenciaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden modificar reservas pendientes, sin pago registrado todavía',
      );
    }

    const data: Prisma.ReservaUncheckedUpdateInput = {};
    let fechaInicio = reserva.fechaServicioInicio;
    let fechaFin = reserva.fechaServicioFin;

    if (reserva.tipo === 'MULTIPLE' && dto.serviciosMultiples?.length) {
      const lineasMultiples: {
        servicio: { id: string; monedaId: string };
        fecha: Date;
        horaInicio: string;
        precio: number;
      }[] = [];
      for (const linea of dto.serviciosMultiples) {
        const s = await this.prisma.servicio.findFirst({ where: { id: linea.servicioId, agenciaId } });
        if (!s) throw new NotFoundException(`Servicio no encontrado: ${linea.servicioId}`);
        const precioMinimo = Number(s.precioBase);
        const precio = linea.precio ?? precioMinimo;
        if (precio < precioMinimo) {
          throw new BadRequestException(
            `El precio de "${s.nombre}" no puede ser menor al precio establecido (${precioMinimo})`,
          );
        }
        lineasMultiples.push({
          servicio: { id: s.id, monedaId: s.monedaId },
          fecha: new Date(linea.fecha),
          horaInicio: linea.horaInicio ?? '00:00',
          precio,
        });
      }
      const fechas = lineasMultiples.map((l) => l.fecha.getTime());
      fechaInicio = new Date(Math.min(...fechas));
      fechaFin = new Date(Math.max(...fechas));
      data.fechaServicioInicio = fechaInicio;
      data.fechaServicioFin = fechaFin;

      await this.prisma.itinerario.deleteMany({ where: { reservaId: id } });
      const fechasUnicas = Array.from(new Set(lineasMultiples.map((l) => l.fecha.getTime()))).sort(
        (a, b) => a - b,
      );
      await this.prisma.itinerario.create({
        data: {
          reservaId: id,
          dias: {
            create: fechasUnicas.map((fechaTime, idx) => ({
              numeroDia: idx + 1,
              fecha: new Date(fechaTime),
              servicios: {
                create: lineasMultiples
                  .filter((l) => l.fecha.getTime() === fechaTime)
                  .map((l) => ({
                    servicioId: l.servicio.id,
                    horaInicio: l.horaInicio,
                    precio: l.precio,
                    monedaId: l.servicio.monedaId,
                  })),
              },
            })),
          },
        },
      });
    } else {
      if (dto.fechaServicioInicio) fechaInicio = new Date(dto.fechaServicioInicio);
      fechaFin = dto.fechaServicioFin
        ? new Date(dto.fechaServicioFin)
        : dto.fechaServicioInicio
          ? fechaInicio
          : fechaFin;
      if (fechaFin < fechaInicio) {
        throw new BadRequestException('fechaServicioFin no puede ser anterior a fechaServicioInicio');
      }
      if (dto.fechaServicioInicio) data.fechaServicioInicio = fechaInicio;
      if (dto.fechaServicioFin || dto.fechaServicioInicio) data.fechaServicioFin = fechaFin;
      if (dto.horaServicio !== undefined) data.horaServicio = dto.horaServicio;
      if (dto.monedaId) data.monedaId = dto.monedaId;

      const cantidadPasajeros = dto.pasajeros?.length ?? (await this.prisma.pasajero.count({ where: { reservaId: id } }));
      let precioEstablecido = 0;
      if (reserva.tipo === 'PLANTILLA' && reserva.plantillaItinerarioId) {
        const plantillaEncontrada = await this.prisma.plantillaItinerario.findFirst({
          where: { id: reserva.plantillaItinerarioId, agenciaId },
          include: { dias: { include: { servicios: { include: { servicio: true } } } } },
        });
        precioEstablecido =
          (plantillaEncontrada?.dias.reduce(
            (acc, dia) => acc + dia.servicios.reduce((s, item) => s + Number(item.servicio.precioBase), 0),
            0,
          ) ?? 0) * cantidadPasajeros;
      } else if (reserva.servicioId) {
        const servicioEncontrado = await this.prisma.servicio.findFirst({
          where: { id: reserva.servicioId, agenciaId },
        });
        precioEstablecido = Number(servicioEncontrado?.precioBase ?? 0) * cantidadPasajeros;
      }
      if (dto.precioLiquidado !== undefined) {
        if (dto.precioLiquidado < precioEstablecido) {
          throw new BadRequestException(
            `El precio a liquidar no puede ser menor al precio establecido (${precioEstablecido})`,
          );
        }
        data.total = dto.precioLiquidado;
      }

      // Reservas de "servicio"/"plantilla" tienen un único día de itinerario (o varios, para
      // plantilla) que se recorren completos: si cambió la fecha de inicio, se recalculan todos
      // los días de itinerario en base al nuevo inicio, igual que en la creación.
      if (dto.fechaServicioInicio) {
        const dias = await this.prisma.itinerarioDia.findMany({
          where: { itinerario: { reservaId: id } },
          orderBy: { numeroDia: 'asc' },
        });
        for (const dia of dias) {
          await this.prisma.itinerarioDia.update({
            where: { id: dia.id },
            data: { fecha: new Date(fechaInicio.getTime() + (dia.numeroDia - 1) * MS_POR_DIA) },
          });
        }
      }
    }

    if (dto.pasajeros) {
      const hayResponsable = dto.pasajeros.some((p) => p.esResponsable);
      const pasajerosData = dto.pasajeros.map((p, i) => ({
        ...p,
        esResponsable: hayResponsable ? Boolean(p.esResponsable) : i === 0,
      }));
      await this.prisma.pasajero.deleteMany({ where: { reservaId: id } });
      data.pasajeros = { create: pasajerosData };
    }

    await this.prisma.reserva.update({ where: { id }, data });

    if (dto.fechaServicioInicio || dto.serviciosMultiples?.length) {
      // El voucher (QR) codifica la reserva y su expiración según fechaServicioFin; si esta
      // cambió hay que regenerarlo para que el QR/expiración sigan siendo correctos.
      await this.prisma.voucher.deleteMany({ where: { reservaId: id } });
      await this.vouchersService.generar(id, agenciaId, reserva.codigoReserva, fechaFin);
    }

    return this.findOne(agenciaId, id);
  }

  async cancelar(agenciaId: string, id: string) {
    await this.findOne(agenciaId, id);
    return this.prisma.reserva.update({ where: { id }, data: { estado: 'CANCELADA' } });
  }

  /**
   * Confirma una reserva registrando el pago. La forma de pago se elige recién en este paso
   * (no al crear la reserva). Los requisitos (número/referencia de pago y foto de comprobante)
   * dependen de cómo esté configurada la forma de pago elegida (FormaPago.config:
   * { requiereReferencia, requiereComprobante, permitePagoDiferido }):
   * - Si permitePagoDiferido es true, se puede confirmar sin referencia ni comprobante (el
   *   cliente pagará después); el pago queda registrado con estado PENDIENTE en vez de PAGADO.
   * - Si no, se aplican requiereReferencia/requiereComprobante como antes (por defecto
   *   requiereReferencia=true, requiereComprobante=false).
   * En reservas MULTIPLE no hay un total/moneda único, así que monto y monedaId son obligatorios.
   */
  async confirmar(agenciaId: string, id: string, dto: ConfirmarReservaDto) {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id, agenciaId },
      include: { moneda: true, itinerario: { include: INCLUDE_ITINERARIO_MONTOS } },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede confirmar una reserva cancelada');
    }

    const formaPago = await this.prisma.formaPago.findFirst({
      where: { id: dto.formaPagoId, agenciaId },
    });
    if (!formaPago) throw new NotFoundException('Forma de pago no encontrada');

    const config =
      (formaPago.config as {
        requiereReferencia?: boolean;
        requiereComprobante?: boolean;
        permitePagoDiferido?: boolean;
      }) ?? {};
    const permitePagoDiferido = config.permitePagoDiferido ?? false;
    const requiereReferencia = permitePagoDiferido ? false : (config.requiereReferencia ?? true);
    const requiereComprobante = permitePagoDiferido ? false : (config.requiereComprobante ?? false);

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

    const monto = dto.monto ?? (reserva.total !== null ? Number(reserva.total) : undefined);
    const monedaPagoId = dto.monedaId ?? reserva.monedaId ?? undefined;
    if (monto === undefined || !monedaPagoId) {
      throw new BadRequestException(
        'Esta reserva incluye servicios en distintas monedas: indica el monto y la moneda de este pago',
      );
    }

    // En reservas MULTIPLE el monto se indica manualmente (no viene ya validado contra
    // reserva.total como en SERVICIO/PLANTILLA), así que se verifica que cubra el total de
    // todos los servicios de la reserva. Si el pago está en una moneda distinta a alguno de
    // los servicios, la comparación se hace convirtiendo ambos a la moneda principal (ver
    // mantenedor de monedas); si no hay moneda principal configurada, no se puede convertir y
    // se omite esta validación.
    if (reserva.tipo === 'MULTIPLE') {
      const montosReserva = desglosePorMoneda(reserva);
      const totalDirecto = montosReserva.find((m) => m.monedaId === monedaPagoId);
      const cubreEnUnaSolaMoneda = montosReserva.length === 1 && totalDirecto;
      if (cubreEnUnaSolaMoneda) {
        if (monto < totalDirecto.total - 0.01) {
          throw new BadRequestException(
            `El monto del pago (${monto}) no cubre el total de los servicios de la reserva (${totalDirecto.total.toFixed(2)} ${totalDirecto.monedaCodigo})`,
          );
        }
      } else if (montosReserva.length > 0) {
        const monedaPrincipal = await this.obtenerMonedaPrincipal(agenciaId);
        const monedaPago = await this.prisma.moneda.findFirst({ where: { id: monedaPagoId, agenciaId } });
        if (monedaPrincipal && monedaPago) {
          const totalReservaPrincipal = convertirAPrincipal(montosReserva, monedaPrincipal)?.total ?? 0;
          const montoPrincipal = (monto * Number(monedaPago.tasaCambio)) / monedaPrincipal.tasaCambio;
          if (montoPrincipal < totalReservaPrincipal - 0.01) {
            throw new BadRequestException(
              `El monto del pago (equivalente a ${montoPrincipal.toFixed(2)} ${monedaPrincipal.codigo}) no cubre el total de los servicios de la reserva (${totalReservaPrincipal.toFixed(2)} ${monedaPrincipal.codigo})`,
            );
          }
        }
      }
    }

    const tienePrueba = Boolean(dto.referenciaExterna || dto.comprobanteUrl);

    await this.prisma.$transaction([
      this.prisma.pago.create({
        data: {
          reservaId: id,
          formaPagoId: dto.formaPagoId,
          monto,
          monedaId: monedaPagoId,
          referenciaExterna: dto.referenciaExterna,
          comprobanteUrl: dto.comprobanteUrl,
          estado: permitePagoDiferido && !tienePrueba ? 'PENDIENTE' : 'PAGADO',
        },
      }),
      this.prisma.reserva.update({
        where: { id },
        data: { estado: 'CONFIRMADA', formaPagoId: dto.formaPagoId },
      }),
    ]);

    return this.findOne(agenciaId, id);
  }
}
