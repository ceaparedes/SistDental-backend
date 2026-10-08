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
import { SuperadminGuard } from '../auth/guards/superadmin.guard';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { PlatformTenantsService } from './platform-tenants.service';

@ApiTags('plataforma')
@ApiBearerAuth()
@UseGuards(SuperadminGuard)
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get()
  findAll() {
    return this.tenants.findAll();
  }

  /** Crea una clínica con su configuración y su primer administrador. */
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  /** Renombra o suspende una clínica. */
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }
}
