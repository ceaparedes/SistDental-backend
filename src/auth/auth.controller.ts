import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto, RefreshDto, SelectTenantDto } from './dto/auth.dto';
import { AccessTokenPayload } from './jwt-payload';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Inicia sesión. Devuelve las clínicas del usuario y, si tiene una sola, la deja activa. */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.tenantId);
  }

  /** Cambia la clínica activa y devuelve tokens nuevos. */
  @ApiBearerAuth()
  @Post('select-tenant')
  @HttpCode(200)
  selectTenant(@CurrentUser() user: AccessTokenPayload, @Body() dto: SelectTenantDto) {
    return this.auth.selectTenant(user, dto.tenantId);
  }

  /** Renueva el par de tokens. */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Usuario actual, clínica activa con su rol y permisos, y clínicas disponibles. */
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.me(user);
  }
}
