import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResultsService } from './results.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { ResultQueryFilterDto } from './dto/result.dto';
import { ScoreCorrectionDto } from '../evaluation/dto/evaluation.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller()
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * List assessment results with multi-criteria filters (FR-ADMIN-003).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get('admin/results')
  async listResults(@Query() filters: ResultQueryFilterDto) {
    return this.resultsService.listResults(filters);
  }

  /**
   * Export authorized assessment results to CSV (FR-ADMIN-004, FR-ADMIN-008).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/results/export/csv')
  async exportResultsCsv(
    @Query('assessmentId') assessmentId: string,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    const csvContent = await this.resultsService.exportResultsCsv(
      assessmentId,
      actorUserId,
      correlationId,
      clientIp,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="results-${assessmentId}-${Date.now()}.csv"`,
    );
    res.status(HttpStatus.OK).send(csvContent);
  }

  /**
   * Assessment and question level performance analytics (FR-ADMIN-006, FR-ADMIN-009).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get('admin/results/assessments/:assessmentId/statistics')
  async getAssessmentStatistics(@Param('assessmentId') assessmentId: string) {
    return this.resultsService.getAssessmentStatistics(assessmentId);
  }

  /**
   * Get detailed per-question candidate result breakdown (FR-ADMIN-005).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get('admin/results/:id')
  async getResultDetails(@Param('id') resultId: string) {
    return this.resultsService.getResultDetails(resultId);
  }

  /**
   * Score correction endpoint with mandatory justification and audit trail (FR-SCORE-010, UC-15, TC-14).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/results/corrections')
  @HttpCode(HttpStatus.OK)
  async correctScore(
    @Body() dto: ScoreCorrectionDto,
    @CurrentUser('userId') adminUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    return this.evaluationService.correctScore(adminUserId, dto, correlationId, clientIp);
  }

  /**
   * Candidate result view governed by assessment resultVisibility policy (FR-ADMIN-007, BR-009, TC-09).
   */
  @Roles(UserRole.CANDIDATE)
  @Get('candidate/assessments/:assessmentId/result')
  async getCandidateResult(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser('userId') candidateUserId: string,
  ) {
    return this.resultsService.getCandidateResult(candidateUserId, assessmentId);
  }
}
