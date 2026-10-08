import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { ROLES_SISTEMA } from '../auth/permissions.catalog';
import { PrismaService } from '../prisma/prisma.service';
import { toConfiguracionData } from '../tenant/dto/configuracion.dto';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class PlatformTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { usuarios: true } } },
    });
  }

  /** Crea la clínica, su configuración y vincula (o crea) a su primer administrador. */
  async create(dto: CreateTenantDto) {
    const adminEmail = dto.admin.email.toLowerCase();
    const existente = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existente && !dto.admin.password) {
      throw new BadRequestException('admin.password es obligatoria para un usuario nuevo');
    }
    const passwordHash = existente ? undefined : await hashPassword(dto.admin.password!);

    const rolAdmin = await this.prisma.role.findFirst({
      where: { tenantId: null, codigo: ROLES_SISTEMA.ADMINISTRADOR.codigo },
    });
    if (!rolAdmin) {
      throw new Error('Falta el rol ADMINISTRADOR: ejecuta el seed (npm run db:seed)');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            nombre: dto.nombre,
            slug: dto.slug,
            configuracion: { create: toConfiguracionData(dto.configuracion) },
          },
          include: { configuracion: true },
        });
        const admin =
          existente ??
          (await tx.user.create({
            data: { email: adminEmail, nombre: dto.admin.nombre, passwordHash: passwordHash! },
          }));
        await tx.usuarioTenant.create({
          data: { userId: admin.id, tenantId: tenant.id, roleId: rolAdmin.id },
        });
        return { ...tenant, admin: { id: admin.id, email: admin.email, nombre: admin.nombre } };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe una clínica con el slug "${dto.slug}"`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateTenantDto) {
    try {
      return await this.prisma.tenant.update({ where: { id }, data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Clínica no encontrada');
      }
      throw e;
    }
  }
}
