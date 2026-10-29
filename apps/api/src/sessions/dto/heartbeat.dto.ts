import { IsOptional, IsString } from 'class-validator';

export class SessionHeartbeatDto {
  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  clientVersion?: string;
}
