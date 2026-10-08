import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../auth/decorators/current.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantContext } from '../auth/jwt-payload';
import { PERMISOS } from '../auth/permissions.catalog';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('clínica')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@RequirePermissions(PERMISOS.ROLES_VER)
@Controller()
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Roles asignables en la clínica activa (de sistema y propios), con sus permisos. */
  @Get('roles')
  async roles(@CurrentTenant() ctx: TenantContext) {
    const roles = await this.prisma.role.findMany({
      where: { OR: [{ tenantId: null }, { tenantId: ctx.tenantId }] },
      include: { permisos: { include: { permission: true } } },
      orderBy: { nombre: 'asc' },
    });
    return roles.map(({ permisos, ...rol }) => ({
      ...rol,
      esDeSistema: rol.tenantId === null,
      permisos: permisos.map((rp) => rp.permission.codigo),
    }));
  }

  @Get('permissions')
  permissions() {
    return this.prisma.permission.findMany({ orderBy: { codigo: 'asc' } });
  }
}
