import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../jwt-payload';

/** Rutas de plataforma: solo superadmins activos (se revisa en la base, no solo en el token). */
@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { activo: true, esSuperadmin: true },
    });
    if (!dbUser?.activo || !dbUser.esSuperadmin) {
      throw new ForbiddenException('Solo para administradores de la plataforma');
    }
    return true;
  }
}
