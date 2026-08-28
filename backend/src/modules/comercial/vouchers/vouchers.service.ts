import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';

const VOUCHER_EXPIRA_HORAS_MARGEN = 24;

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  /**
   * Genera el JWT del QR y el voucher asociado a una reserva ya creada.
   * fechaServicioFin se usa para calcular el exp del JWT (ver diseno-qr-checkin.md).
   */
  async generar(reservaId: string, agenciaId: string, codigoReserva: string, fechaServicioFin: Date) {
    const segundosHastaExpirar =
      Math.floor((fechaServicioFin.getTime() - Date.now()) / 1000) + VOUCHER_EXPIRA_HORAS_MARGEN * 3600;

    const token = this.qrTokenService.sign(
      { sub: reservaId, agenciaId },
      Math.max(segundosHastaExpirar, 3600),
    );

    const qrDataUrl = await QRCode.toDataURL(token);

    return this.prisma.voucher.create({
      data: {
        reservaId,
        codigo: codigoReserva,
        qrUrl: qrDataUrl,
        validoHasta: new Date(fechaServicioFin.getTime() + VOUCHER_EXPIRA_HORAS_MARGEN * 3600 * 1000),
      },
    });
  }
}
