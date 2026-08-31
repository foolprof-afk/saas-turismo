import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Ids de usuarios (vendedores) cuyas reservas puede ver el usuario autenticado: el mismo,
 * mas los "usuarios hijos" que se le hayan asignado en el mantenedor de Usuarios
 * (Usuario.usuariosVisibles). Los admin ven todo dentro de su agencia, por eso retornan
 * null (sin restriccion) en vez de una lista.
 */
export async function resolverVendedorIdsPermitidos(
  prisma: PrismaService,
  user: AuthenticatedUser,
): Promise<string[] | null> {
  if (user.rol === 'admin') return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.userId },
    select: { usuariosVisibles: { select: { id: true } } },
  });
  return [user.userId, ...(usuario?.usuariosVisibles.map((u) => u.id) ?? [])];
}
