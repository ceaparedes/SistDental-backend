import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toConfiguracionData, UpdateConfiguracionDto } from './dto/configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { configuracion: true },
    });
    return {
      tenant: { id: tenant.id, nombre: tenant.nombre, slug: tenant.slug },
      configuracion: tenant.configuracion,
    };
  }

  update(tenantId: string, dto: UpdateConfiguracionDto) {
    const data = toConfiguracionData(dto);
    return this.prisma.tenantConfiguracion.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }
}
