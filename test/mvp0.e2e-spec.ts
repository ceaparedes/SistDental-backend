import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

interface Tokens {
  accessToken: string;
  refreshToken: string;
  tenantActivo: string | null;
  tenants: { id: string; slug: string; rol: string }[];
}

describe('MVP0: tenants, usuarios, roles y permisos (e2e)', () => {
  let app: INestApplication<App>;
  let http: () => ReturnType<typeof request>;
  let roles: Record<string, string>;

  let superToken: string;
  let tenantA: string;
  let tenantB: string;
  let adminA: Tokens;
  let adminB: Tokens;
  let dentistaId: string;

  const login = async (email: string, password: string, tenantId?: string): Promise<Tokens> => {
    const res = await http().post('/auth/login').send({ email, password, tenantId }).expect(200);
    return res.body as Tokens;
  };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = () => request(app.getHttpServer());

    const sistema = await app.get(PrismaService).role.findMany({ where: { tenantId: null } });
    roles = Object.fromEntries(sistema.map((r) => [r.codigo, r.id]));

    superToken = (await login('superadmin@test.local', 'Super1234!')).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('GET /health es público', () => http().get('/health').expect(200, { status: 'ok' }));

    it('rechaza rutas sin token', () => http().get('/auth/me').expect(401));

    it('rechaza contraseña incorrecta y email inexistente con el mismo mensaje', async () => {
      const a = await http()
        .post('/auth/login')
        .send({ email: 'superadmin@test.local', password: 'mala-clave' })
        .expect(401);
      const b = await http()
        .post('/auth/login')
        .send({ email: 'nadie@test.local', password: 'mala-clave' })
        .expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('valida el body', () =>
      http().post('/auth/login').send({ email: 'no-es-email', password: 'x' }).expect(400));
  });

  describe('plataforma', () => {
    it('el superadmin crea clínicas con su primer administrador', async () => {
      const resA = await http()
        .post('/platform/tenants')
        .set(bearer(superToken))
        .send({
          nombre: 'Clínica Norte',
          slug: 'clinica-norte',
          configuracion: { telefono: '+56 9 1111 1111', zonaHoraria: 'America/Santiago' },
          admin: { email: 'Admin@Norte.cl', nombre: 'Ana Norte', password: 'Norte1234!' },
        })
        .expect(201);
      expect(resA.body.configuracion.telefono).toBe('+56 9 1111 1111');
      expect(resA.body.admin.email).toBe('admin@norte.cl');
      tenantA = resA.body.id;

      const resB = await http()
        .post('/platform/tenants')
        .set(bearer(superToken))
        .send({
          nombre: 'Clínica Sur',
          slug: 'clinica-sur',
          admin: { email: 'admin@sur.cl', nombre: 'Beto Sur', password: 'Sur12345!' },
        })
        .expect(201);
      tenantB = resB.body.id;
    });

    it('no permite slugs duplicados', () =>
      http()
        .post('/platform/tenants')
        .set(bearer(superToken))
        .send({
          nombre: 'Otra',
          slug: 'clinica-norte',
          admin: { email: 'otro@norte.cl', nombre: 'Otro', password: 'Otro1234!' },
        })
        .expect(409));

    it('exige contraseña si el administrador es nuevo', () =>
      http()
        .post('/platform/tenants')
        .set(bearer(superToken))
        .send({ nombre: 'X', slug: 'clinica-x', admin: { email: 'x@x.cl', nombre: 'X' } })
        .expect(400));

    it('un administrador de clínica no puede usar rutas de plataforma', async () => {
      adminA = await login('admin@norte.cl', 'Norte1234!');
      await http().get('/platform/tenants').set(bearer(adminA.accessToken)).expect(403);
    });
  });

  describe('clínica', () => {
    beforeAll(async () => {
      adminA = await login('admin@norte.cl', 'Norte1234!');
      adminB = await login('admin@sur.cl', 'Sur12345!');
    });

    it('con una sola clínica, el login la deja activa', async () => {
      expect(adminA.tenantActivo).toBe(tenantA);
      const me = await http().get('/auth/me').set(bearer(adminA.accessToken)).expect(200);
      expect(me.body.tenantActivo.rol).toBe('ADMINISTRADOR');
      expect(me.body.tenantActivo.permisos).toContain('usuarios.crear');
    });

    it('el administrador ve y edita la configuración de su clínica', async () => {
      await http()
        .patch('/tenant/configuracion')
        .set(bearer(adminA.accessToken))
        .send({ direccion: 'Av. Siempre Viva 123', moneda: 'CLP' })
        .expect(200);
      const res = await http()
        .get('/tenant/configuracion')
        .set(bearer(adminA.accessToken))
        .expect(200);
      expect(res.body.tenant.id).toBe(tenantA);
      expect(res.body.configuracion.direccion).toBe('Av. Siempre Viva 123');
    });

    it('el administrador agrega un dentista', async () => {
      const res = await http()
        .post('/tenant/users')
        .set(bearer(adminA.accessToken))
        .send({
          email: 'dentista@norte.cl',
          nombre: 'Diego Dentista',
          password: 'Dent1234!',
          roleId: roles.DENTISTA,
        })
        .expect(201);
      expect(res.body.rol.codigo).toBe('DENTISTA');
      dentistaId = res.body.id;

      await http()
        .post('/tenant/users')
        .set(bearer(adminA.accessToken))
        .send({ email: 'dentista@norte.cl', nombre: 'Diego', roleId: roles.DENTISTA })
        .expect(409);
    });

    it('el dentista ve usuarios pero no puede crear ni editar configuración', async () => {
      const dentista = await login('dentista@norte.cl', 'Dent1234!');
      await http().get('/tenant/users').set(bearer(dentista.accessToken)).expect(200);
      await http()
        .post('/tenant/users')
        .set(bearer(dentista.accessToken))
        .send({ email: 'z@z.cl', nombre: 'Z', password: 'Zzzz1234!', roleId: roles.DENTISTA })
        .expect(403);
      await http()
        .patch('/tenant/configuracion')
        .set(bearer(dentista.accessToken))
        .send({ telefono: '123' })
        .expect(403);
    });

    it('nadie puede cambiar su propio rol', async () => {
      const me = await http().get('/auth/me').set(bearer(adminA.accessToken)).expect(200);
      await http()
        .patch(`/tenant/users/${me.body.usuario.id}`)
        .set(bearer(adminA.accessToken))
        .send({ roleId: roles.RECEPCION })
        .expect(403);
    });
  });

  describe('aislamiento entre clínicas', () => {
    it('la clínica Sur no ve usuarios de la clínica Norte', async () => {
      const res = await http().get('/tenant/users').set(bearer(adminB.accessToken)).expect(200);
      const emails = (res.body as { email: string }[]).map((u) => u.email);
      expect(emails).toEqual(['admin@sur.cl']);
    });

    it('la clínica Sur no puede editar usuarios de la clínica Norte', () =>
      http()
        .patch(`/tenant/users/${dentistaId}`)
        .set(bearer(adminB.accessToken))
        .send({ activo: false })
        .expect(404));

    it('no se puede activar una clínica a la que no se pertenece', async () => {
      await http()
        .post('/auth/select-tenant')
        .set(bearer(adminA.accessToken))
        .send({ tenantId: tenantB })
        .expect(403);
      await http()
        .post('/auth/login')
        .send({ email: 'admin@norte.cl', password: 'Norte1234!', tenantId: tenantB })
        .expect(403);
    });
  });

  describe('un usuario en varias clínicas', () => {
    it('la clínica Sur vincula al dentista existente sin pedir contraseña', async () => {
      const res = await http()
        .post('/tenant/users')
        .set(bearer(adminB.accessToken))
        .send({ email: 'dentista@norte.cl', nombre: 'Ignorado', roleId: roles.RECEPCION })
        .expect(201);
      expect(res.body.id).toBe(dentistaId);
      expect(res.body.nombre).toBe('Diego Dentista');
    });

    it('el login no elige clínica y las rutas de clínica lo exigen', async () => {
      const dentista = await login('dentista@norte.cl', 'Dent1234!');
      expect(dentista.tenantActivo).toBeNull();
      expect(dentista.tenants.map((t) => t.slug).sort()).toEqual(['clinica-norte', 'clinica-sur']);
      await http().get('/tenant/users').set(bearer(dentista.accessToken)).expect(403);

      const sel = await http()
        .post('/auth/select-tenant')
        .set(bearer(dentista.accessToken))
        .send({ tenantId: tenantB })
        .expect(200);
      const conf = await http()
        .get('/tenant/configuracion')
        .set(bearer(sel.body.accessToken))
        .expect(200);
      expect(conf.body.tenant.id).toBe(tenantB);

      const me = await http().get('/auth/me').set(bearer(sel.body.accessToken)).expect(200);
      expect(me.body.tenantActivo.rol).toBe('RECEPCION');
    });
  });

  describe('revocación de acceso', () => {
    it('desactivar al dentista en Norte corta su acceso y su refresh en Norte', async () => {
      const dentista = await login('dentista@norte.cl', 'Dent1234!', tenantA);
      await http().get('/tenant/users').set(bearer(dentista.accessToken)).expect(200);

      await http()
        .patch(`/tenant/users/${dentistaId}`)
        .set(bearer(adminA.accessToken))
        .send({ activo: false })
        .expect(200);

      await http().get('/tenant/users').set(bearer(dentista.accessToken)).expect(403);
      await http().post('/auth/refresh').send({ refreshToken: dentista.refreshToken }).expect(401);
    });

    it('suspender una clínica bloquea sus rutas', async () => {
      await http()
        .patch(`/platform/tenants/${tenantB}`)
        .set(bearer(superToken))
        .send({ estado: 'SUSPENDIDO' })
        .expect(200);
      await http().get('/tenant/users').set(bearer(adminB.accessToken)).expect(403);
    });
  });

  describe('refresh', () => {
    it('renueva tokens y no acepta un access token como refresh', async () => {
      const res = await http()
        .post('/auth/refresh')
        .send({ refreshToken: adminA.refreshToken })
        .expect(200);
      expect(res.body.tenantActivo).toBe(tenantA);
      await http().get('/tenant/users').set(bearer(res.body.accessToken)).expect(200);

      await http().post('/auth/refresh').send({ refreshToken: adminA.accessToken }).expect(401);
    });
  });
});
