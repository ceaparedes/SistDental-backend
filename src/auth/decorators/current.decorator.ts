import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload, AuthenticatedRequest, TenantContext } from '../jwt-payload';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AccessTokenPayload =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TenantContext => {
    const tenant = ctx.switchToHttp().getRequest<AuthenticatedRequest>().tenant;
    if (!tenant) {
      throw new Error('CurrentTenant se usó en una ruta sin TenantGuard');
    }
    return tenant;
  },
);
