import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../auth/jwt-payload';
import { hashPassword } from '../auth/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';

const MEMBERSHIP_INCLUDE = {
  user: { select: { id: true, email: true, nombre: true, activo: true } },
  role: { select: { id: true, codigo: true, nombre: true } },
} satisfies Prisma.UsuarioTenantInclude;

type MembershipConUsuario = Prisma.UsuarioTenantGetPayload<{ include: typeof MEMBERSHIP_INCLUDE }>;

@Injectable()
export class TenantUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ctx: TenantContext) {
    const memberships = await this.prisma.usuarioTenant.findMany({
      where: { tenantId: ctx.tenantId },
      include: MEMBERSHIP_INCLUDE,
      orderBy: { user: { nombre: 'asc' } },
    });
    return memberships.map(toTenantUser);
  }

  /** Agrega un usuario a la clínica: crea la cuenta si no existe, o vincula la existente. */
  async create(ctx: TenantContext, dto: CreateTenantUserDto) {
    await this.assertRolDisponible(ctx.tenantId, dto.roleId);
    const email = dto.email.toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const yaVinculado = await this.prisma.usuarioTenant.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: ctx.tenantId } },
      });
      if (yaVinculado) {
        throw new ConflictException('Ese usuario ya pertenece a esta clínica');
      }
    } else {
      if (!dto.password) {
        throw new BadRequestException('password es obligatoria para un usuario nuevo');
      }
      user = await this.prisma.user.create({
        data: { email, nombre: dto.nombre, passwordHash: await hashPassword(dto.password) },
      });
    }

    const membership = await this.prisma.usuarioTenant.create({
      data: { userId: user.id, tenantId: ctx.tenantId, roleId: dto.roleId },
      include: MEMBERSHIP_INCLUDE,
    });
    return toTenantUser(membership);
  }

  /** Cambia el rol del usuario en la clínica o activa/desactiva su acceso a ella. */
  async update(ctx: TenantContext, userId: string, dto: UpdateTenantUserDto) {
    if (userId === ctx.userId) {
      throw new ForbiddenException('No puedes cambiar tu propio rol ni desactivarte');
    }
    const membership = await this.prisma.usuarioTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId: ctx.tenantId } },
    });
    if (!membership) {
      throw new NotFoundException('Usuario no encontrado en esta clínica');
    }
    if (dto.roleId) {
      await this.assertRolDisponible(ctx.tenantId, dto.roleId);
    }

    const actualizado = await this.prisma.usuarioTenant.update({
      where: { id: membership.id },
      data: { roleId: dto.roleId, activo: dto.activo },
      include: MEMBERSHIP_INCLUDE,
    });
    return toTenantUser(actualizado);
  }

  /** Solo se pueden asignar roles de sistema o roles propios de esta clínica. */
  private async assertRolDisponible(tenantId: string, roleId: string) {
    const rol = await this.prisma.role.findFirst({
      where: { id: roleId, OR: [{ tenantId: null }, { tenantId }] },
    });
    if (!rol) {
      throw new BadRequestException('Rol no válido para esta clínica');
    }
  }
}

function toTenantUser(m: MembershipConUsuario) {
  return {
    id: m.user.id,
    email: m.user.email,
    nombre: m.user.nombre,
    /** acceso a esta clínica */
    activo: m.activo,
    /** estado de la cuenta global */
    cuentaActiva: m.user.activo,
    rol: m.role,
    vinculadoEn: m.creadoEn,
  };
}
