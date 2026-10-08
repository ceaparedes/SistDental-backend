import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTenantUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  /** Obligatoria solo si el email aún no tiene cuenta. Si ya existe, solo se vincula. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsUUID()
  roleId: string;
}

export class UpdateTenantUserDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  /** false desactiva el acceso del usuario a esta clínica (no a su cuenta). */
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
