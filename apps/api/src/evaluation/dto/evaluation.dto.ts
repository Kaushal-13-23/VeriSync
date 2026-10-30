import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class EvaluateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionAttemptId!: string;

  @IsNumber()
  @Min(0)
  marksAwarded!: number;

  @IsString()
  @IsOptional()
  evaluatorFeedback?: string;
}

export class ScoreCorrectionDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsOptional()
  questionAttemptId?: string;

  @IsNumber()
  revisedScore!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class EvaluationQueueFilterDto {
  @IsString()
  @IsOptional()
  assessmentId?: string;
}
