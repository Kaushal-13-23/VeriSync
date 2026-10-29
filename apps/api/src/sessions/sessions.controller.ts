import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { SessionHeartbeatDto } from './dto/heartbeat.dto';
import { AdminSessionOverrideDto } from './dto/admin-override.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Start Assessment Session (UC-08, FR-UI-002, BR-007, TC-15, TC-16)
   */
  @Roles(UserRole.CANDIDATE)
  @Post('candidate/assessments/:id/start')
  @HttpCode(HttpStatus.CREATED)
  async startSession(
    @Param('id') assessmentId: string,
    @Body() dto: StartSessionDto,
    @CurrentUser('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    return this.sessionsService.startSession(userId, assessmentId, dto, correlationId, clientIp);
  }

  /**
   * Get Active Question & Authoritative Deadline (FR-UI-003, TC-08, TC-09)
   */
  @Roles(UserRole.CANDIDATE)
  @Get('candidate/sessions/:id/current-question')
  async getCurrentQuestion(@Param('id') sessionId: string, @CurrentUser('userId') userId: string) {
    return this.sessionsService.getCurrentQuestion(userId, sessionId);
  }

  /**
   * Authoritative Session Status & Remaining Time (FR-TIME-008, FR-UI-004, TC-07)
   */
  @Roles(UserRole.CANDIDATE)
  @Get('candidate/sessions/:id/status')
  async getSessionStatus(@Param('id') sessionId: string, @CurrentUser('userId') userId: string) {
    return this.sessionsService.getSessionStatus(userId, sessionId);
  }

  /**
   * Session Heartbeat (BR-010, UC-12)
   */
  @Roles(UserRole.CANDIDATE)
  @Post('candidate/sessions/:id/heartbeat')
  async sendHeartbeat(
    @Param('id') sessionId: string,
    @Body() dto: SessionHeartbeatDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.sessionsService.sendHeartbeat(userId, sessionId, dto);
  }

  /**
   * Submit Question Answer with Idempotency-Key (FR-ANS-001..009, FR-TIME-001..011, TC-01..05)
   */
  @Roles(UserRole.CANDIDATE)
  @Post('candidate/sessions/:id/answers')
  async submitAnswer(
    @Param('id') sessionId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    return this.sessionsService.submitAnswer(
      userId,
      sessionId,
      idempotencyKey,
      dto,
      correlationId,
      clientIp,
    );
  }

  /**
   * Autosave Draft without Submitting or Extending Deadlines (FR-ANS-005)
   */
  @Roles(UserRole.CANDIDATE)
  @Put('candidate/sessions/:id/draft')
  async saveDraft(
    @Param('id') sessionId: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.sessionsService.saveDraft(userId, sessionId, dto);
  }

  /**
   * Final Assessment Submission (FR-ANS-008, UC-13, Decision 4)
   */
  @Roles(UserRole.CANDIDATE)
  @Post('candidate/sessions/:id/final-submit')
  async finalSubmit(
    @Param('id') sessionId: string,
    @CurrentUser('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    return this.sessionsService.finalSubmit(userId, sessionId, correlationId, clientIp);
  }

  /**
   * Admin Session Override (BR-012, UC-12, FR-TIME-011)
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/sessions/:id/override')
  async adminOverride(
    @Param('id') sessionId: string,
    @Body() dto: AdminSessionOverrideDto,
    @CurrentUser('userId') adminUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    return this.sessionsService.adminOverride(adminUserId, sessionId, dto, correlationId, clientIp);
  }
}
