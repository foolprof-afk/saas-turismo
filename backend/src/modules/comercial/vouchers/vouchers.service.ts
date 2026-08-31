import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../../prisma/prisma.service';
import { desglosePorMoneda } from '../../../common/utils/reserva-montos.util';
import { QrTokenService } from './qr-token.service';

const VOUCHER_EXPIRA_HORAS_MARGEN = 24;

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  /**
   * Genera el JWT del QR y el voucher asociado a una reserva ya creada. El QR codifica una URL
   * pública (no el JWT crudo) para que, al escanearlo con la cámara del celular, se abra
   * directamente el visualizador de la reserva. fechaServicioFin se usa para calcular el exp
   * del JWT (ver diseno-qr-checkin.md).
   */
  async generar(reservaId: string, agenciaId: string, codigoReserva: string, fechaServicioFin: Date) {
    const segundosHastaExpirar =
      Math.floor((fechaServicioFin.getTime() - Date.now()) / 1000) + VOUCHER_EXPIRA_HORAS_MARGEN * 3600;

    const token = this.qrTokenService.sign(
      { sub: reservaId, agenciaId },
      Math.max(segundosHastaExpirar, 3600),
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const url = `${frontendUrl}/voucher/${token}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    return this.prisma.voucher.create({
      data: {
        reservaId,
        codigo: codigoReserva,
        qrUrl: qrDataUrl,
        url,
        validoHasta: new Date(fechaServicioFin.getTime() + VOUCHER_EXPIRA_HORAS_MARGEN * 3600 * 1000),
      },
    });
  }

  /**
   * Devuelve los datos de la reserva para el visualizador público del voucher (sin autenticación,
   * validado únicamente por la firma del JWT del QR), de forma que el cliente pueda confirmar
   * que su reserva es real al escanear el código.
   */
  async obtenerPublico(token: string) {
    const payload = this.qrTokenService.verify(token);

    const reserva = await this.prisma.reserva.findFirst({
      where: { id: payload.sub, agenciaId: payload.agenciaId },
      include: {
        cliente: true,
        pasajeros: true,
        voucher: true,
        moneda: true,
        itinerario: {
          include: { dias: { include: { servicios: { include: { servicio: true, moneda: true } } } } },
        },
      },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return { ...reserva, montos: desglosePorMoneda(reserva) };
  }
}
