import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    ['admin', 'vendedor', 'operacion', 'finanzas'].map((nombre) =>
      prisma.rol.upsert({ where: { nombre }, update: {}, create: { nombre } }),
    ),
  );
  const rolAdmin = roles.find((r) => r.nombre === 'admin')!;

  const agencia = await prisma.agencia.upsert({
    where: { subdominio: 'demo' },
    update: {},
    create: { nombre: 'Agencia Demo', subdominio: 'demo' },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { agenciaId_email: { agenciaId: agencia.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      agenciaId: agencia.id,
      rolId: rolAdmin.id,
      nombre: 'Administrador Demo',
      email: 'admin@demo.com',
      passwordHash,
    },
  });

  await Promise.all([
    prisma.moneda.upsert({
      where: { agenciaId_codigo: { agenciaId: agencia.id, codigo: 'USD' } },
      update: {},
      create: { agenciaId: agencia.id, codigo: 'USD', simbolo: '$', esPrincipal: true },
    }),
    prisma.formaPago
      .create({
        data: {
          agenciaId: agencia.id,
          nombre: 'efectivo',
          config: { requiereReferencia: false, requiereComprobante: false },
        },
      })
      .catch(() => null),
    ...['traslado', 'tour', 'hospedaje'].map((nombre) =>
      prisma.tipoServicio.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      }),
    ),
  ]);

  console.log('Seed completado: agencia "demo", usuario admin@demo.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
