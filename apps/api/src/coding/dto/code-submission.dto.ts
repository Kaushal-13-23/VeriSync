import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ExecutionStatus, SubmissionStatus, TestCaseSampleResultDto } from '@verisync/shared';

export class CreateCodeSubmissionDto {
  @IsNotEmpty({ message: 'questionAttemptId is required' })
  @IsString()
  questionAttemptId!: string;

  @IsNotEmpty({ message: 'language is required' })
  @IsString()
  language!: string; // 'c' | 'cpp' | 'java' | 'python' | 'javascript' | 'sql'

  @IsNotEmpty({ message: 'sourceCode is required' })
  @IsString()
  sourceCode!: string;
}

export class CodeSubmissionResponseDto {
  submissionId!: string;
  questionAttemptId!: string;
  status!: SubmissionStatus;
  submittedAt!: string;
}

export class CodeSubmissionStatusDto {
  submissionId!: string;
  questionAttemptId!: string;
  submissionStatus!: SubmissionStatus;
  executionStatus?: ExecutionStatus | null;
  awardedMarks?: number | null;
  totalMarks?: number | null;
  compilerOutput?: string | null;
  executionTimeMs?: number | null;
  memoryUsedKb?: number | null;
  sampleTestResults?: TestCaseSampleResultDto[];
  isInfrastructureError?: boolean;
  errorMessage?: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class UpdateRetentionSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  sourceCodeRetentionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  resultRetentionDays?: number;

  @IsOptional()
  autoPurgeEnabled?: boolean;
}
