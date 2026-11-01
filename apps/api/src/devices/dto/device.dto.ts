import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { DeviceStatus } from '@verisync/shared';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceReference: string;

  @IsString()
  @IsNotEmpty()
  approvedClientVersion: string;

  @IsString()
  @IsOptional()
  hostname?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  macAddress?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDeviceStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED'] as const)
  @IsNotEmpty()
  status: DeviceStatus;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateDeviceVersionDto {
  @IsString()
  @IsNotEmpty()
  approvedClientVersion: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RecordLockdownEventDto {
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsString()
  @IsNotEmpty()
  clientTimestamp: string;

  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  windowTitle?: string;

  @IsString()
  @IsOptional()
  processName?: string;
}
