import { IsIn, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { AdminSessionOverrideAction } from '@verisync/shared';

export class AdminSessionOverrideDto {
  @IsIn(['EXTEND', 'REOPEN', 'PAUSE', 'RESUME', 'CANCEL'])
  action!: AdminSessionOverrideAction;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsPositive()
  extensionMinutes?: number;
}
