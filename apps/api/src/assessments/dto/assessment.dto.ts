import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentStatus } from '@prisma/client';
import { NavigationMode, ResultVisibility } from '@verisync/shared';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsNotEmpty()
  roleCategory!: string;

  @IsInt()
  @Min(1)
  overallDuration!: number; // Duration in minutes

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalMarks?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  passingMarks?: number;

  @IsBoolean()
  @IsOptional()
  negativeMarking?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  negativeMarkValue?: number;

  @IsBoolean()
  @IsOptional()
  randomizeQuestions?: boolean;

  @IsBoolean()
  @IsOptional()
  randomizeOptions?: boolean;

  @IsEnum(NavigationMode)
  @IsOptional()
  navigationMode?: NavigationMode;

  @IsEnum(ResultVisibility)
  @IsOptional()
  resultVisibility?: ResultVisibility;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  attemptLimit?: number;
}

export class UpdateAssessmentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  roleCategory?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  overallDuration?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalMarks?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  passingMarks?: number;

  @IsBoolean()
  @IsOptional()
  negativeMarking?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  negativeMarkValue?: number;

  @IsBoolean()
  @IsOptional()
  randomizeQuestions?: boolean;

  @IsBoolean()
  @IsOptional()
  randomizeOptions?: boolean;

  @IsEnum(NavigationMode)
  @IsOptional()
  navigationMode?: NavigationMode;

  @IsEnum(ResultVisibility)
  @IsOptional()
  resultVisibility?: ResultVisibility;

  @IsDateString()
  @IsOptional()
  startAt?: string;

  @IsDateString()
  @IsOptional()
  endAt?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  attemptLimit?: number;
}

export class AssessmentQuestionItemDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsInt()
  @Min(1)
  sequenceNumber!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimitSeconds?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  marksOverride?: number;
}

export class MapAssessmentQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionItemDto)
  questions!: AssessmentQuestionItemDto[];
}

export class UpdateAssessmentStatusDto {
  @IsEnum(AssessmentStatus)
  status!: AssessmentStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}
