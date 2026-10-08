// Sincroniza el catálogo de permisos y roles de sistema, crea el superadmin
// y, fuera de producción, una clínica de prueba. Se puede ejecutar varias veces.
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';
import { DESCRIPCION_PERMISOS, PERMISOS, ROLES_SISTEMA } from '../src/auth/permissions.catalog';

const prisma = new PrismaClient();

async function syncCatalogo() {
  for (const codigo of Object.values(PERMISOS)) {
    await prisma.permission.upsert({
      where: { codigo },
      create: { codigo, descripcion: DESCRIPCION_PERMISOS[codigo] },
      update: { descripcion: DESCRIPCION_PERMISOS[codigo] },
    });
  }
  const permisos = await prisma.permission.findMany();
  const idPorCodigo = new Map(permisos.map((p) => [p.codigo, p.id]));

  for (const def of Object.values(ROLES_SISTEMA)) {
    // Los roles de sistema tienen tenant_id null, así que no sirve upsert por (tenant_id, codigo).
    const existente = await prisma.role.findFirst({
      where: { tenantId: null, codigo: def.codigo },
    });
    const rol = existente
      ? await prisma.role.update({
          where: { id: existente.id },
          data: { nombre: def.nombre, descripcion: def.descripcion },
        })
      : await prisma.role.create({
          data: { codigo: def.codigo, nombre: def.nombre, descripcion: def.descripcion },
        });

    await prisma.rolePermission.deleteMany({ where: { roleId: rol.id } });
    await prisma.rolePermission.createMany({
      data: def.permisos.map((codigo) => ({
        roleId: rol.id,
        permissionId: idPorCodigo.get(codigo)!,
      })),
    });
  }
}

async function upsertUsuario(
  email: string,
  nombre: string,
  password: string,
  esSuperadmin = false,
) {
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return esSuperadmin && !existente.esSuperadmin
      ? prisma.user.update({ where: { id: existente.id }, data: { esSuperadmin } })
      : existente;
  }
  return prisma.user.create({
    data: { email, nombre, passwordHash: await hashPassword(password), esSuperadmin },
  });
}

async function seedClinicaDemo() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'clinica-demo' },
    create: {
      nombre: 'Clínica Demo',
      slug: 'clinica-demo',
      configuracion: { create: { razonSocial: 'Clínica Demo SpA', telefono: '+56 2 2345 6789' } },
    },
    update: {},
  });

  const usuarios = [
    { email: 'admin@demo.cl', nombre: 'Admin Demo', rol: ROLES_SISTEMA.ADMINISTRADOR.codigo },
    { email: 'dentista@demo.cl', nombre: 'Dentista Demo', rol: ROLES_SISTEMA.DENTISTA.codigo },
    { email: 'recepcion@demo.cl', nombre: 'Recepción Demo', rol: ROLES_SISTEMA.RECEPCION.codigo },
  ];
  for (const u of usuarios) {
    const user = await upsertUsuario(u.email, u.nombre, 'Demo1234!');
    const rol = await prisma.role.findFirstOrThrow({ where: { tenantId: null, codigo: u.rol } });
    await prisma.usuarioTenant.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      create: { userId: user.id, tenantId: tenant.id, roleId: rol.id },
      update: {},
    });
  }
}

async function main() {
  await syncCatalogo();
  console.log('✓ Permisos y roles de sistema sincronizados');

  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (email && password) {
    await upsertUsuario(email.toLowerCase(), 'Superadmin', password, true);
    console.log(`✓ Superadmin ${email}`);
  } else {
    console.log('· Sin SEED_SUPERADMIN_EMAIL/PASSWORD: no se creó superadmin');
  }

  if (process.env.NODE_ENV !== 'production') {
    await seedClinicaDemo();
    console.log('✓ Clínica Demo (admin@demo.cl, dentista@demo.cl, recepcion@demo.cl / Demo1234!)');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
