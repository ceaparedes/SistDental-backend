import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { PlatformModule } from './platform/platform.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    PlatformModule,
    TenantModule,
    RolesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
