import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedRequest } from '../jwt-payload';

/**
 * Rutas de clínica: exige un tenant activo en el token, valida contra la base de datos
 * que el vínculo usuario-clínica siga activo y que el rol tenga los permisos pedidos.
 * Deja el contexto en request.tenant para que los servicios filtren por tenantId.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { sub: userId, tid: tenantId } = request.user;
    if (!tenantId) {
      throw new ForbiddenException('Primero selecciona una clínica');
    }

    const membership = await this.prisma.usuarioTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        user: { select: { activo: true } },
        tenant: { select: { estado: true } },
        role: { include: { permisos: { include: { permission: true } } } },
      },
    });
    if (
      !membership ||
      !membership.activo ||
      !membership.user.activo ||
      membership.tenant.estado !== 'ACTIVO'
    ) {
      throw new ForbiddenException('No tienes acceso a esta clínica');
    }

    const permisos = membership.role.permisos.map((rp) => rp.permission.codigo);
    const requeridos =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const faltantes = requeridos.filter((p) => !permisos.includes(p));
    if (faltantes.length > 0) {
      throw new ForbiddenException(`Te falta el permiso: ${faltantes.join(', ')}`);
    }

    request.tenant = { tenantId, userId, roleId: membership.roleId, permisos };
    return true;
  }
}
