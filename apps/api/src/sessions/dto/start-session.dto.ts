import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartSessionDto {
  @IsString()
  @IsNotEmpty()
  clientVersion!: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsBoolean()
  acknowledgedInstructions!: boolean;
}
