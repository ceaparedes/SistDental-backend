# SistDental-backend

Backend del sistema de gestión de clínicas dentales. Node + TypeScript con NestJS, PostgreSQL y Prisma.

## Modelo multi-tenant

```
tenants ─┬─ users ── usuario_tenant ── roles ──▶ permissions
         └─ configuración
```

- **Tenant = clínica.** Todo dato de negocio cuelga de un `tenant_id`.
- **Usuarios globales:** una persona tiene una sola cuenta aunque trabaje en varias clínicas.
- **usuario_tenant** vincula usuario y clínica, con el rol que tiene en esa clínica.
- **Roles de sistema** (`ADMINISTRADOR`, `DENTISTA`, `RECEPCION`) definidos en
  [`src/auth/permissions.catalog.ts`](src/auth/permissions.catalog.ts). La columna `roles.tenant_id`
  deja lista la base para roles propios de cada clínica.
- **Aislamiento:** una sola base de datos; las rutas de clínica pasan por `TenantGuard`, que valida
  el vínculo usuario-clínica en cada request y entrega el `tenantId` con el que filtran los servicios.

## Puesta en marcha

Requisitos: Node 20+ y Docker (o un PostgreSQL 16 propio).

```bash
cp .env.example .env
docker compose up -d       # PostgreSQL en localhost:5432
npm install
npm run db:migrate         # aplica las migraciones
npm run db:seed            # permisos, roles, superadmin y Clínica Demo
npm run start:dev
```

- API: http://localhost:3000
- Documentación Swagger: http://localhost:3000/docs

Usuarios del seed (fuera de producción):

| Email | Contraseña | Rol |
|---|---|---|
| `admin@sistdental.local` | `Admin1234!` | Superadmin de plataforma |
| `admin@demo.cl` | `Demo1234!` | Administrador de Clínica Demo |
| `dentista@demo.cl` | `Demo1234!` | Dentista de Clínica Demo |
| `recepcion@demo.cl` | `Demo1234!` | Recepción de Clínica Demo |

## Flujo de autenticación

1. `POST /auth/login` con email y contraseña. Devuelve `accessToken`, `refreshToken` y la lista de
   clínicas del usuario. Si tiene una sola, queda activa (`tenantActivo`).
2. Si tiene varias, `POST /auth/select-tenant` con el `tenantId` devuelve tokens con esa clínica activa.
3. Las rutas usan `Authorization: Bearer <accessToken>`.
4. `POST /auth/refresh` renueva ambos tokens. `GET /auth/me` devuelve el usuario, la clínica activa,
   su rol y sus permisos (útil para armar el menú del frontend).

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/auth/login`, `/auth/refresh` | Público |
| POST | `/auth/select-tenant` | Autenticado |
| GET | `/auth/me` | Autenticado |
| GET, POST | `/platform/tenants` | Superadmin |
| PATCH | `/platform/tenants/:id` | Superadmin (renombrar o suspender) |
| GET, PATCH | `/tenant/configuracion` | `configuracion.ver` / `configuracion.editar` |
| GET, POST | `/tenant/users` | `usuarios.ver` / `usuarios.crear` |
| PATCH | `/tenant/users/:userId` | `usuarios.editar` (rol o activo) |
| GET | `/roles`, `/permissions` | `roles.ver` |
| GET | `/health` | Público |

## Tests

```bash
npm test             # unitarios
npm run test:e2e     # e2e contra PostgreSQL
```

Los e2e usan la base `sistdental_test` (o `TEST_DATABASE_URL`): aplican migraciones, **vacían las
tablas** y ejecutan el seed. Por seguridad se niegan a correr si el nombre de la base no termina en
`_test`. Con el Postgres de `docker compose`, créala una vez con:

```bash
docker compose exec postgres createdb -U sistdental sistdental_test
```

## Agregar un permiso

1. Agrégalo a `PERMISOS` y `DESCRIPCION_PERMISOS` en `src/auth/permissions.catalog.ts`, y a los roles que
   correspondan en `ROLES_SISTEMA`.
2. Ejecuta `npm run db:seed` para sincronizar la base.
3. Protege la ruta con `@UseGuards(TenantGuard)` y `@RequirePermissions(PERMISOS.NUEVO)`.
