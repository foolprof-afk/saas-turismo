import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/l/I, evita confusión al transcribir
const LARGO_CODIGO = 7;

function generarCodigo(): string {
  const bytes = randomBytes(LARGO_CODIGO);
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return codigo;
}

/**
 * Acorta las URLs públicas que se comparten con clientes (reserva-cliente, voucher,
 * cotizacion-cliente, cuadre-cliente, etc.), cuyo token autoverificable (HMAC/JWT) las hace muy
 * largas para copiar/enviar por WhatsApp o correo. No reemplaza la verificación de esos tokens:
 * solo guarda la URL completa original y redirige a ella (ver LinksCortosController). Si no hay
 * agencia dueña: esta tabla es infraestructura genérica, no multi-tenant.
 *
 * El link corto se expone bajo /api/l/:codigo (no /l/:codigo): en producción, nginx solo
 * reenvía al backend lo que entra por /api/ (ver /etc/nginx/sites-enabled en el VPS); el resto
 * de rutas van al frontend Next.js, que no tiene ninguna página /l/[codigo]. Usando el mismo
 * prefijo /api/ que ya usa el resto de la API no hace falta tocar la configuración de nginx.
 */
@Injectable()
export class LinksCortosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un código corto para destino y devuelve la URL corta completa
   * (`${frontendUrl}/api/l/:codigo`). Si ya existe un código vigente para ese mismo destino
   * exacto (p. ej. se volvió a pedir el mismo enlace sin que el token de destino cambiara), lo
   * reutiliza en vez de crear uno nuevo, para no acumular filas de más.
   */
  async acortar(destino: string, expiraEn?: Date): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const existente = await this.prisma.linkCorto.findFirst({
      where: { destino, OR: [{ expiraEn: null }, { expiraEn: { gt: new Date() } }] },
      orderBy: { creadoEn: 'desc' },
    });
    if (existente) return `${frontendUrl}/api/l/${existente.codigo}`;

    for (let intento = 0; intento < 5; intento++) {
      const codigo = generarCodigo();
      try {
        await this.prisma.linkCorto.create({ data: { codigo, destino, expiraEn } });
        return `${frontendUrl}/api/l/${codigo}`;
      } catch {
        // Colisión de código (muy improbable con 7 caracteres de un alfabeto de 57): reintenta.
      }
    }
    throw new Error('No se pudo generar un link corto único');
  }

  async resolver(codigo: string): Promise<string> {
    const link = await this.prisma.linkCorto.findUnique({ where: { codigo } });
    if (!link) throw new NotFoundException('Link no encontrado');
    if (link.expiraEn && link.expiraEn < new Date()) {
      throw new NotFoundException('Link expirado');
    }
    return link.destino;
  }
}
