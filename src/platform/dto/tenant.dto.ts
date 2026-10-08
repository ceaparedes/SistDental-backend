import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TenantEstado } from '@prisma/client';
import { UpdateConfiguracionDto } from '../../tenant/dto/configuracion.dto';

export class TenantAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  /** Obligatoria solo si el email aún no tiene cuenta. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  /** Identificador en URL: minúsculas, números y guiones. */
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug solo admite minúsculas, números y guiones',
  })
  @MaxLength(60)
  slug: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateConfiguracionDto)
  configuracion?: UpdateConfiguracionDto;

  /** Primer administrador de la clínica. */
  @ValidateNested()
  @Type(() => TenantAdminDto)
  admin: TenantAdminDto;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsEnum(TenantEstado)
  estado?: TenantEstado;
}
