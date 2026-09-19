import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservasService } from '../reservas/reservas.service';
import { TipoPasajeroDto } from '../reservas/dto/create-reserva.dto';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { resolverVendedorIdsPermitidos } from '../../../common/utils/visibilidad.util';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { convertirMonto } from '../../../common/utils/reserva-montos.util';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface FiltrosCotizacion {
  estado?: string;
  codigoCotizacion?: string;
  vendedorId?: string;
  clienteId?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const INCLUDE_COTIZACION = {
  cliente: true,
  vendedor: true,
  listaPrecio: true,
  moneda: true,
  reserva: { select: { id: true, codigoReserva: true } },
  items: { include: { servicio: true, moneda: true } },
} as const;

@Injectable()
export class CotizacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservasService: ReservasService,
  ) {}

  private construirWhere(
    agenciaId: string,
    filtros: FiltrosCotizacion = {},
    vendedorIdsPermitidos: string[] | null = null,
  ): Prisma.CotizacionWhereInput {
    const where: Prisma.CotizacionWhereInput = { agenciaId };

    if (filtros.codigoCotizacion) {
      where.codigoCotizacion = { contains: filtros.codigoCotizacion, mode: 'insensitive' };
    }
    if (filtros.estado) where.estado = filtros.estado as Prisma.EnumEstadoCotizacionFilter['equals'];
    if (filtros.vendedorId) {
      if (vendedorIdsPermitidos && !vendedorIdsPermitidos.includes(filtros.vendedorId)) {
        throw new ForbiddenException('No tienes permiso para ver las cotizaciones de ese vendedor');
      }
      where.vendedorId = filtros.vendedorId;
    } else if (vendedorIdsPermitidos) {
      where.vendedorId = { in: vendedorIdsPermitidos };
    }
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (!filtros.codigoCotizacion && (filtros.fechaInicio || filtros.fechaFin)) {
      where.fechaServicio = {
        ...(filtros.fechaInicio ? { gte: new Date(filtros.fechaInicio) } : {}),
        ...(filtros.fechaFin ? { lte: new Date(filtros.fechaFin) } : {}),
      };
    }
    return where;
  }

  async findAll(agenciaId: string, skip = 0, take = 20, filtros: FiltrosCotizacion = {}, user?: AuthenticatedUser) {
    const vendedorIdsPermitidos = user ? await resolverVendedorIdsPermitidos(this.prisma, user) : null;
    return this.prisma.cotizacion.findMany({
      where: this.construirWhere(agenciaId, filtros, vendedorIdsPermitidos),
      include: INCLUDE_COTIZACION,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(agenciaId: string, id: string, user?: AuthenticatedUser) {
    const vendedorIdsPermitidos = user ? await resolverVendedorIdsPermitidos(this.prisma, user) : null;
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: {
        id,
        agenciaId,
        ...(vendedorIdsPermitidos ? { vendedorId: { in: vendedorIdsPermitidos } } : {}),
      },
      include: { ...INCLUDE_COTIZACION, agencia: { select: { logoUrl: true, nombre: true } } },
    });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    return cotizacion;
  }

  private generarCodigoCotizacion(): string {
    return `COT-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Cliente = identidad comercial bajo la cual vende el usuario logueado, igual que en
   * ReservasService.resolverClientePropio (ver arquitectura-backend.md).
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
   * Valida que la lista de precios exista y que el usuario tenga acceso a ella: el admin
   * puede usar cualquiera activa de la agencia, el resto solo las asignadas explícitamente
   * en Usuario.listasPrecio (ver ListasPrecioService.misListas).
   */
  private async resolverListaPrecio(agenciaId: string, user: AuthenticatedUser, listaPrecioId?: string) {
    if (!listaPrecioId) return null;
    const lista = await this.prisma.listaPrecio.findFirst({
      where: { id: listaPrecioId, agenciaId, estado: 'ACTIVO' },
    });
    if (!lista) throw new NotFoundException('Lista de precio no encontrada');
    if (user.rol !== 'admin') {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: user.userId },
        select: { listasPrecio: { select: { id: true } } },
      });
      const permitido = usuario?.listasPrecio.some((l) => l.id === listaPrecioId);
      if (!permitido) throw new ForbiddenException('No tienes acceso a esa lista de precios');
    }
    return lista;
  }

  /**
   * Valida que la moneda exista y pertenezca a la agencia. Es la moneda en la que se le
   * presenta el total al cliente; cada línea conserva su propia moneda de origen y se
   * convierte al vuelo con convertirMonto (ver totalConvertido en findOne).
   */
  private async resolverMoneda(agenciaId: string, monedaId?: string) {
    if (!monedaId) return null;
    const moneda = await this.prisma.moneda.findFirst({ where: { id: monedaId, agenciaId } });
    if (!moneda) throw new NotFoundException('Moneda no encontrada');
    return moneda;
  }

  private async construirItems(
    agenciaId: string,
    items: { servicioId: string; dia?: number; precioUnitario?: number }[],
    factor: number,
  ) {
    const itemsData: { servicioId: string; dia: number; precioUnitario: number; monedaId: string }[] = [];
    for (const item of items) {
      const servicio = await this.prisma.servicio.findFirst({ where: { id: item.servicioId, agenciaId } });
      if (!servicio) throw new NotFoundException(`Servicio no encontrado: ${item.servicioId}`);
      itemsData.push({
        servicioId: servicio.id,
        dia: item.dia ?? 1,
        precioUnitario: item.precioUnitario ?? Number(servicio.precioBase) * factor,
        monedaId: servicio.monedaId,
      });
    }
    return itemsData;
  }

  async create(agenciaId: string, vendedorId: string, user: AuthenticatedUser, dto: CreateCotizacionDto) {
    const listaPrecio = await this.resolverListaPrecio(agenciaId, user, dto.listaPrecioId);
    const moneda = await this.resolverMoneda(agenciaId, dto.monedaId);
    const factor = 1 + (listaPrecio ? Number(listaPrecio.porcentajeAdicional) : 0) / 100;
    const itemsData = await this.construirItems(agenciaId, dto.items, factor);
    const cliente = await this.resolverClientePropio(agenciaId, vendedorId);

    const cotizacion = await this.prisma.cotizacion.create({
      data: {
        agenciaId,
        clienteId: cliente.id,
        vendedorId,
        listaPrecioId: listaPrecio?.id,
        monedaId: moneda?.id,
        codigoCotizacion: this.generarCodigoCotizacion(),
        cantidadPersonas: dto.cantidadPersonas,
        pasajeroResponsable: dto.pasajeroResponsable,
        documentoResponsable: dto.documentoResponsable,
        telefonoResponsable: dto.telefonoResponsable,
        fechaServicio: new Date(dto.fechaServicio),
        notas: dto.notas,
        items: { create: itemsData },
      },
    });

    return this.findOne(agenciaId, cotizacion.id, user);
  }

  /**
   * Actualiza los datos de la cotización. Solo permitido mientras está PENDIENTE (ver docstring
   * de UpdateCotizacionDto). Si cambia la lista de precios y no se reenvían items, se recalcula
   * el precioUnitario de los items existentes con el nuevo factor.
   */
  async actualizar(agenciaId: string, id: string, user: AuthenticatedUser, dto: UpdateCotizacionDto) {
    const cotizacion = await this.prisma.cotizacion.findFirst({ where: { id, agenciaId } });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    if (cotizacion.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden modificar cotizaciones pendientes');
    }

    const data: Prisma.CotizacionUncheckedUpdateInput = {};
    if (dto.cantidadPersonas !== undefined) data.cantidadPersonas = dto.cantidadPersonas;
    if (dto.pasajeroResponsable !== undefined) data.pasajeroResponsable = dto.pasajeroResponsable;
    if (dto.documentoResponsable !== undefined) data.documentoResponsable = dto.documentoResponsable;
    if (dto.telefonoResponsable !== undefined) data.telefonoResponsable = dto.telefonoResponsable;
    if (dto.fechaServicio !== undefined) data.fechaServicio = new Date(dto.fechaServicio);
    if (dto.notas !== undefined) data.notas = dto.notas;

    let listaPrecioCambio = false;
    let listaPrecio: { porcentajeAdicional: Prisma.Decimal } | null = null;
    if (dto.listaPrecioId !== undefined) {
      listaPrecioCambio = true;
      listaPrecio = dto.listaPrecioId ? await this.resolverListaPrecio(agenciaId, user, dto.listaPrecioId) : null;
      data.listaPrecioId = listaPrecio ? dto.listaPrecioId : null;
    }

    if (dto.monedaId !== undefined) {
      const moneda = await this.resolverMoneda(agenciaId, dto.monedaId);
      data.monedaId = moneda?.id ?? null;
    }

    if (dto.items?.length) {
      const factor =
        1 +
        Number(
          listaPrecio?.porcentajeAdicional ??
            (data.listaPrecioId === undefined && cotizacion.listaPrecioId
              ? (await this.prisma.listaPrecio.findUnique({ where: { id: cotizacion.listaPrecioId } }))
                  ?.porcentajeAdicional
              : 0) ??
            0,
        ) / 100;
      const itemsData = await this.construirItems(agenciaId, dto.items, factor);
      await this.prisma.cotizacionItem.deleteMany({ where: { cotizacionId: id } });
      data.items = { create: itemsData };
    } else if (listaPrecioCambio) {
      const factor = 1 + Number(listaPrecio?.porcentajeAdicional ?? 0) / 100;
      const items = await this.prisma.cotizacionItem.findMany({
        where: { cotizacionId: id },
        include: { servicio: true },
      });
      await Promise.all(
        items.map((item) =>
          this.prisma.cotizacionItem.update({
            where: { id: item.id },
            data: { precioUnitario: Number(item.servicio.precioBase) * factor },
          }),
        ),
      );
    }

    await this.prisma.cotizacion.update({ where: { id }, data });
    return this.findOne(agenciaId, id, user);
  }

  async cancelar(agenciaId: string, id: string) {
    const cotizacion = await this.prisma.cotizacion.findFirst({ where: { id, agenciaId } });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    return this.prisma.cotizacion.update({ where: { id }, data: { estado: 'CANCELADA' } });
  }

  /**
   * Elimina definitivamente la cotización (cascada a sus items, ver schema.prisma). Solo se
   * permite si nunca se confirmó como reserva (reservaId null); una vez que existe una reserva
   * real vinculada, la cotización debe conservarse como respaldo histórico de esa reserva.
   */
  async eliminar(agenciaId: string, id: string) {
    const cotizacion = await this.prisma.cotizacion.findFirst({ where: { id, agenciaId } });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    if (cotizacion.reservaId) {
      throw new BadRequestException('No se puede eliminar una cotización que ya se convirtió en reserva');
    }
    return this.prisma.cotizacion.delete({ where: { id } });
  }

  /**
   * Transforma la cotización en una reserva real de tipo MULTIPLE, reutilizando
   * ReservasService.create (voucher, itinerario y transacción quedan a cargo de ese método,
   * sin duplicar esa lógica aquí). El precio de cada línea ya viene multiplicado por
   * cantidadPersonas porque las líneas MULTIPLE no se multiplican automáticamente por
   * pasajero (a diferencia de reservas de tipo SERVICIO/PLANTILLA).
   */
  async confirmar(agenciaId: string, id: string, user: AuthenticatedUser) {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: { id, agenciaId },
      include: { items: true },
    });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    if (cotizacion.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede confirmar una cotización cancelada');
    }
    if (cotizacion.estado === 'CONFIRMADA') {
      throw new BadRequestException('Esta cotización ya fue confirmada');
    }
    if (!cotizacion.items.length) {
      throw new BadRequestException('La cotización no tiene servicios');
    }

    const reserva = await this.reservasService.create(agenciaId, cotizacion.vendedorId, {
      serviciosMultiples: cotizacion.items.map((item) => ({
        servicioId: item.servicioId,
        fecha: new Date(cotizacion.fechaServicio.getTime() + (item.dia - 1) * MS_POR_DIA).toISOString(),
        precio: Number(item.precioUnitario) * cotizacion.cantidadPersonas,
      })),
      pasajeros: [
        {
          nombre: cotizacion.pasajeroResponsable,
          documento: cotizacion.documentoResponsable ?? undefined,
          telefono: cotizacion.telefonoResponsable ?? undefined,
          tipo: TipoPasajeroDto.ADULTO,
          esResponsable: true,
        },
      ],
    });

    await this.prisma.cotizacion.update({
      where: { id },
      data: { estado: 'CONFIRMADA', reservaId: reserva.id },
    });

    return this.findOne(agenciaId, id, user);
  }
}
