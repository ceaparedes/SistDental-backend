import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

/** Deja la base de test limpia: aplica migraciones, vacía las tablas y ejecuta el seed. */
export default async function globalSetup(): Promise<void> {
  await import('./setup-env');
  const url = new URL(process.env.DATABASE_URL!);
  if (!url.pathname.endsWith('_test')) {
    throw new Error(
      `Los tests e2e vacían la base; su nombre debe terminar en _test (${url.pathname})`,
    );
  }

  const run = (cmd: string) => execSync(cmd, { stdio: 'inherit', env: process.env });
  run('npx prisma migrate deploy');

  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(
    'TRUNCATE tenants, tenant_configuracion, users, usuario_tenant, roles, permissions, role_permissions CASCADE',
  );
  await prisma.$disconnect();

  run('npx prisma db seed');
}
