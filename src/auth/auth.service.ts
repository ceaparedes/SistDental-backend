import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenPayload, RefreshTokenPayload } from './jwt-payload';
import { hashPassword, verifyPassword } from './password';

const CREDENCIALES_INVALIDAS = 'Email o contraseña incorrectos';

@Injectable()
export class AuthService {
  // Hash de relleno para que un email inexistente tarde lo mismo que una contraseña errónea.
  private readonly dummyHash = hashPassword('sistdental-dummy-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, tenantId?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const ok = await verifyPassword(user?.passwordHash ?? (await this.dummyHash), password);
    if (!user || !ok || !user.activo) {
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    const tenants = await this.tenantsDelUsuario(user.id);
    let tenantActivo: string | undefined;
    if (tenantId) {
      if (!tenants.some((t) => t.id === tenantId)) {
        throw new ForbiddenException('No tienes acceso a esta clínica');
      }
      tenantActivo = tenantId;
    } else if (tenants.length === 1) {
      tenantActivo = tenants[0].id;
    }

    return {
      ...(await this.emitirTokens(user.id, user.esSuperadmin, tenantActivo)),
      tenantActivo: tenantActivo ?? null,
      tenants,
    };
  }

  async selectTenant(user: AccessTokenPayload, tenantId: string) {
    const tenants = await this.tenantsDelUsuario(user.sub);
    if (!tenants.some((t) => t.id === tenantId)) {
      throw new ForbiddenException('No tienes acceso a esta clínica');
    }
    return { ...(await this.emitirTokens(user.sub, user.sa, tenantId)), tenantActivo: tenantId };
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.activo) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.tid) {
      const tenants = await this.tenantsDelUsuario(user.id);
      if (!tenants.some((t) => t.id === payload.tid)) {
        throw new UnauthorizedException('Ya no tienes acceso a esta clínica');
      }
    }
    return {
      ...(await this.emitirTokens(user.id, user.esSuperadmin, payload.tid)),
      tenantActivo: payload.tid ?? null,
    };
  }

  async me(token: AccessTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: token.sub },
      select: { id: true, email: true, nombre: true, esSuperadmin: true, activo: true },
    });
    if (!user?.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    const tenants = await this.tenantsDelUsuario(user.id);

    let tenantActivo: { id: string; nombre: string; rol: string; permisos: string[] } | null = null;
    if (token.tid) {
      const membership = await this.prisma.usuarioTenant.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: token.tid } },
        include: {
          tenant: { select: { nombre: true } },
          role: { include: { permisos: { include: { permission: true } } } },
        },
      });
      if (membership?.activo) {
        tenantActivo = {
          id: token.tid,
          nombre: membership.tenant.nombre,
          rol: membership.role.codigo,
          permisos: membership.role.permisos.map((rp) => rp.permission.codigo),
        };
      }
    }

    const usuario = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      esSuperadmin: user.esSuperadmin,
    };
    return { usuario, tenantActivo, tenants };
  }

  /** Clínicas activas en las que el usuario tiene un vínculo activo. */
  private async tenantsDelUsuario(userId: string) {
    const memberships = await this.prisma.usuarioTenant.findMany({
      where: { userId, activo: true, tenant: { estado: 'ACTIVO' } },
      include: { tenant: true, role: true },
      orderBy: { tenant: { nombre: 'asc' } },
    });
    return memberships.map((m) => ({
      id: m.tenant.id,
      nombre: m.tenant.nombre,
      slug: m.tenant.slug,
      rol: m.role.codigo,
    }));
  }

  private async emitirTokens(userId: string, esSuperadmin: boolean, tenantId?: string) {
    const access: AccessTokenPayload = { sub: userId, sa: esSuperadmin, typ: 'access' };
    const refresh: RefreshTokenPayload = { sub: userId, typ: 'refresh' };
    if (tenantId) {
      access.tid = tenantId;
      refresh.tid = tenantId;
    }
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(access, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwt.signAsync(refresh, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
