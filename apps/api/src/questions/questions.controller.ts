import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, UpdateQuestionStatusDto } from './dto/question.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller('admin/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * Create question with options or test cases in question bank (FR-QB-001..006).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Body() dto: CreateQuestionDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.questionsService.createQuestion(dto, actorUserId, correlationId);
  }

  /**
   * Search and filter questions by keyword, topic, difficulty, type (FR-QB-007).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get()
  async listQuestions(
    @Query('search') search?: string,
    @Query('topic') topic?: string,
    @Query('difficulty') difficulty?: string,
    @Query('questionType') questionType?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.questionsService.listQuestions({
      search,
      topic,
      difficulty,
      questionType,
      status,
      page,
      limit,
    });
  }

  /**
   * Get single question details with options and test cases (FR-QB-004).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get(':id')
  async getQuestionById(@Param('id') id: string) {
    return this.questionsService.getQuestionById(id);
  }

  /**
   * Edit question enforcing version immutability (FR-QB-008).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Put(':id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.questionsService.updateQuestion(id, dto, actorUserId, correlationId);
  }

  /**
   * Deactivate or archive question (FR-QB-009).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  async updateQuestionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionStatusDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.questionsService.updateQuestionStatus(id, dto, actorUserId, correlationId);
  }
}
