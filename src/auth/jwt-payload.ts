export interface AccessTokenPayload {
  /** id del usuario */
  sub: string;
  /** tenant (clínica) activo; ausente hasta que el usuario elige una */
  tid?: string;
  /** es superadmin de la plataforma */
  sa: boolean;
  typ: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tid?: string;
  typ: 'refresh';
}

/** Contexto que el TenantGuard adjunta al request en rutas de clínica. */
export interface TenantContext {
  tenantId: string;
  userId: string;
  roleId: string;
  permisos: string[];
}

export interface AuthenticatedRequest {
  user: AccessTokenPayload;
  tenant?: TenantContext;
}
