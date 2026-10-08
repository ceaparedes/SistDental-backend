// Catálogo de permisos y roles de sistema. El seed lo sincroniza con la base de datos,
// y los controladores usan estas constantes en @RequirePermissions.

export const PERMISOS = {
  CONFIGURACION_VER: 'configuracion.ver',
  CONFIGURACION_EDITAR: 'configuracion.editar',
  USUARIOS_VER: 'usuarios.ver',
  USUARIOS_CREAR: 'usuarios.crear',
  USUARIOS_EDITAR: 'usuarios.editar',
  ROLES_VER: 'roles.ver',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];

export const DESCRIPCION_PERMISOS: Record<Permiso, string> = {
  'configuracion.ver': 'Ver la configuración de la clínica',
  'configuracion.editar': 'Editar la configuración de la clínica',
  'usuarios.ver': 'Ver los usuarios de la clínica',
  'usuarios.crear': 'Agregar usuarios a la clínica',
  'usuarios.editar': 'Cambiar el rol o desactivar usuarios de la clínica',
  'roles.ver': 'Ver roles y permisos',
};

export const ROLES_SISTEMA = {
  ADMINISTRADOR: {
    codigo: 'ADMINISTRADOR',
    nombre: 'Administrador',
    descripcion: 'Administra la clínica, su configuración y sus usuarios',
    permisos: Object.values(PERMISOS),
  },
  DENTISTA: {
    codigo: 'DENTISTA',
    nombre: 'Dentista',
    descripcion: 'Profesional clínico',
    permisos: [PERMISOS.CONFIGURACION_VER, PERMISOS.USUARIOS_VER],
  },
  RECEPCION: {
    codigo: 'RECEPCION',
    nombre: 'Recepción',
    descripcion: 'Recepción y agenda',
    permisos: [PERMISOS.CONFIGURACION_VER, PERMISOS.USUARIOS_VER],
  },
} as const satisfies Record<
  string,
  { codigo: string; nombre: string; descripcion: string; permisos: readonly Permiso[] }
>;
