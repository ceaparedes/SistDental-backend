import { DESCRIPCION_PERMISOS, PERMISOS, ROLES_SISTEMA } from './permissions.catalog';

describe('catálogo de permisos', () => {
  it('el administrador tiene todos los permisos', () => {
    expect([...ROLES_SISTEMA.ADMINISTRADOR.permisos].sort()).toEqual(
      Object.values(PERMISOS).sort(),
    );
  });

  it('todo permiso tiene descripción', () => {
    for (const codigo of Object.values(PERMISOS)) {
      expect(DESCRIPCION_PERMISOS[codigo]).toBeTruthy();
    }
  });

  it('los códigos de rol son únicos', () => {
    const codigos = Object.values(ROLES_SISTEMA).map((r) => r.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });
});
