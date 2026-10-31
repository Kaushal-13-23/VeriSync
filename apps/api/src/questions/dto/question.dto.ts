import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, TestCaseVisibility } from '@prisma/client';

export class CreateQuestionOptionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  optionText!: string;

  @IsInt()
  displayOrder!: number;

  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;
}

export class CreateTestCaseDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  inputData!: string;

  @IsString()
  @IsNotEmpty()
  expectedOutput!: string;

  @IsEnum(TestCaseVisibility)
  visibility!: TestCaseVisibility;

  @IsNumber()
  @Min(0)
  marks!: number;
}

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @IsString()
  @IsOptional()
  codeSnippet?: string;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsString()
  @IsNotEmpty()
  difficulty!: string;

  @IsNumber()
  @Min(0.5)
  maximumMarks!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  negativeMarks?: number;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options?: CreateQuestionOptionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  testCases?: CreateTestCaseDto[];
}

export class UpdateQuestionStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string; // ACTIVE or ARCHIVED

  @IsString()
  @IsOptional()
  reason?: string;
}
