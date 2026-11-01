import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@verisync/shared';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';
import { CodingService } from './coding.service';
import {
  CodeSubmissionResponseDto,
  CodeSubmissionStatusDto,
  CreateCodeSubmissionDto,
} from './dto/code-submission.dto';

@Controller('candidate/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodingController {
  constructor(private readonly codingService: CodingService) {}

  /**
   * Submit Code / SQL Query for Evaluation (FR-CODE-001..010, FR-SQL-001..005, UC-11)
   */
  @Post(':id/code-submissions')
  @Roles(UserRole.CANDIDATE)
  @HttpCode(HttpStatus.CREATED)
  async submitCode(
    @Param('id') sessionId: string,
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: CreateCodeSubmissionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CodeSubmissionResponseDto> {
    const userId = req.user.sub || req.user.id;
    const correlationId = req.headers['x-correlation-id'] || `cid-${Date.now()}`;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    return this.codingService.submitCode(
      userId,
      sessionId,
      idempotencyKey,
      dto,
      correlationId,
      clientIp,
    );
  }

  /**
   * Poll Code Submission Status and Sample Test Results (FR-CODE-008, FR-CODE-009, TC-10)
   */
  @Get(':id/code-submissions/:submissionId/status')
  @Roles(UserRole.CANDIDATE)
  async getSubmissionStatus(
    @Param('id') sessionId: string,
    @Param('submissionId') submissionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CodeSubmissionStatusDto> {
    const userId = req.user.sub || req.user.id;
    return this.codingService.getSubmissionStatus(userId, sessionId, submissionId);
  }

  /**
   * List all code submissions for a specific question attempt
   */
  @Get(':id/attempts/:attemptId/submissions')
  @Roles(UserRole.CANDIDATE)
  async getAttemptSubmissions(
    @Param('id') sessionId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.codingService.getAttemptSubmissions(userId, sessionId, attemptId);
  }
}
