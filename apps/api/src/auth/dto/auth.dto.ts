import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string; // Accepts Candidate ID (CAN-2026-081) or Username (Decision 3, FR-AUTH-002)

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AdminPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}

export class DeactivateAccountDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
