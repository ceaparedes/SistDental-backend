import { SetMetadata } from '@nestjs/common';
import { Permiso } from '../permissions.catalog';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Exige que el rol del usuario en la clínica activa tenga todos estos permisos. */
export const RequirePermissions = (...permisos: Permiso[]) =>
  SetMetadata(PERMISSIONS_KEY, permisos);
