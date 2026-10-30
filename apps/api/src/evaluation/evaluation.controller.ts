import { Controller, Get, Post, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluateQuestionDto, EvaluationQueueFilterDto } from './dto/evaluation.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller('admin/evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  /**
   * Get queue of subjective and pending items requiring manual evaluation (FR-SCORE-004, UC-14).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get('queue')
  async getEvaluationQueue(@Query() filters: EvaluationQueueFilterDto) {
    return this.evaluationService.getEvaluationQueue(filters);
  }

  /**
   * Submit manual grading with rubric marks and feedback comments (FR-SCORE-004, FR-SCORE-005, UC-14).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateQuestionAttempt(
    @Body() dto: EvaluateQuestionDto,
    @CurrentUser('userId') evaluatorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    return this.evaluationService.evaluateQuestionAttempt(
      evaluatorUserId,
      dto,
      correlationId,
      clientIp,
    );
  }
}
