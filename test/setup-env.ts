// Valores por defecto para los tests e2e. Se pueden sobrescribir con variables de entorno.
// Ojo: global-setup.ts resetea por completo la base de TEST_DATABASE_URL.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://sistdental:sistdental@localhost:5432/sistdental_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.SEED_SUPERADMIN_EMAIL = 'superadmin@test.local';
process.env.SEED_SUPERADMIN_PASSWORD = 'Super1234!';

export {};
