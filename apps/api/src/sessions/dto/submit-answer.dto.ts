import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionAttemptId!: string;

  @IsNotEmpty()
  answer!: unknown;
}
