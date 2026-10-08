import { Module } from '@nestjs/common';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { TenantUsersController } from './tenant-users.controller';
import { TenantUsersService } from './tenant-users.service';

@Module({
  controllers: [ConfiguracionController, TenantUsersController],
  providers: [ConfiguracionService, TenantUsersService],
})
export class TenantModule {}
