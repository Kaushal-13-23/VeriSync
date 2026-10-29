import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountStatus } from '@prisma/client';

export class CreateCandidateDto {
  @IsString()
  @IsNotEmpty()
  candidateIdentifier!: string; // e.g. CAN-2026-081

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  institution!: string;

  @IsString()
  @IsNotEmpty()
  qualification!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  graduationYear!: number;

  @IsString()
  @IsNotEmpty()
  recruitmentReference!: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class UpdateCandidateDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  graduationYear?: number;

  @IsString()
  @IsOptional()
  recruitmentReference?: string;

  @IsEnum(AccountStatus)
  @IsOptional()
  accountStatus?: AccountStatus;
}

export class BulkImportCandidatesDto {
  @IsString()
  @IsNotEmpty()
  csvData!: string;
}

export class GroupFilterDto {
  @IsString()
  @IsOptional()
  recruitmentReference?: string;

  @IsString()
  @IsOptional()
  institution?: string;

  @IsInt()
  @IsOptional()
  graduationYear?: number;
}

export class AssignAssessmentDto {
  @IsString()
  @IsNotEmpty()
  assessmentId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  candidateIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GroupFilterDto)
  groupFilter?: GroupFilterDto;
}

export class UnassignAssessmentDto {
  @IsString()
  @IsNotEmpty()
  assessmentId!: string;

  @IsString()
  @IsNotEmpty()
  candidateId!: string;
}
