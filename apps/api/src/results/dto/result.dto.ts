import { IsString, IsOptional, IsEnum, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ResultStatus } from '@verisync/shared';

export class ResultQueryFilterDto {
  @IsString()
  @IsOptional()
  assessmentId?: string;

  @IsString()
  @IsOptional()
  candidateIdentifier?: string;

  @IsString()
  @IsOptional()
  status?: 'PASS' | 'FAIL' | 'ALL';

  @IsEnum(ResultStatus)
  @IsOptional()
  resultStatus?: ResultStatus;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 20;
}
