import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  /** Clínica a abrir directamente. Si el usuario tiene una sola, se elige sola. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class SelectTenantDto {
  @IsUUID()
  tenantId: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
