import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../auth/decorators/current.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantContext } from '../auth/jwt-payload';
import { PERMISOS } from '../auth/permissions.catalog';
import { ConfiguracionService } from './configuracion.service';
import { UpdateConfiguracionDto } from './dto/configuracion.dto';

@ApiTags('clínica')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('tenant/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  @RequirePermissions(PERMISOS.CONFIGURACION_VER)
  get(@CurrentTenant() ctx: TenantContext) {
    return this.configuracion.get(ctx.tenantId);
  }

  @Patch()
  @RequirePermissions(PERMISOS.CONFIGURACION_EDITAR)
  update(@CurrentTenant() ctx: TenantContext, @Body() dto: UpdateConfiguracionDto) {
    return this.configuracion.update(ctx.tenantId, dto);
  }
}
