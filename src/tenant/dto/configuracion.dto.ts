import { Prisma } from '@prisma/client';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateConfiguracionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /** Zona horaria IANA, por ejemplo America/Santiago */
  @IsOptional()
  @IsTimeZone()
  zonaHoraria?: string;

  /** Código ISO 4217, por ejemplo CLP */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  /** Horario de atención en formato libre, por ejemplo { "lunes": ["09:00", "18:00"] } */
  @IsOptional()
  @IsObject()
  horario?: Record<string, unknown>;
}

export function toConfiguracionData(dto: UpdateConfiguracionDto | undefined): Omit<
  Prisma.TenantConfiguracionCreateWithoutTenantInput,
  'horario'
> & {
  horario?: Prisma.InputJsonValue;
} {
  if (!dto) return {};
  const { horario, ...resto } = dto;
  return { ...resto, horario: horario as Prisma.InputJsonValue | undefined };
}
