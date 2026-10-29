import { IsNotEmpty, IsString } from 'class-validator';

export class SaveDraftDto {
  @IsString()
  @IsNotEmpty()
  questionAttemptId!: string;

  @IsNotEmpty()
  draftPayload!: unknown;
}
