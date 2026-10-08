import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../auth/decorators/current.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantContext } from '../auth/jwt-payload';
import { PERMISOS } from '../auth/permissions.catalog';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';
import { TenantUsersService } from './tenant-users.service';

@ApiTags('clínica')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('tenant/users')
export class TenantUsersController {
  constructor(private readonly users: TenantUsersService) {}

  @Get()
  @RequirePermissions(PERMISOS.USUARIOS_VER)
  findAll(@CurrentTenant() ctx: TenantContext) {
    return this.users.findAll(ctx);
  }

  @Post()
  @RequirePermissions(PERMISOS.USUARIOS_CREAR)
  create(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateTenantUserDto) {
    return this.users.create(ctx, dto);
  }

  @Patch(':userId')
  @RequirePermissions(PERMISOS.USUARIOS_EDITAR)
  update(
    @CurrentTenant() ctx: TenantContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    return this.users.update(ctx, userId, dto);
  }
}
