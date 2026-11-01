import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import {
  LoginDto,
  VerifyMfaDto,
  RefreshTokenDto,
  AdminPasswordResetDto,
  DeactivateAccountDto,
} from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Unified Login endpoint for SuperAdmin and Candidates (FR-AUTH-001, FR-AUTH-002, Decision 3)
   */
  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const correlationId = req.correlationId || 'unknown';

    return this.authService.login(dto, ip, userAgent, correlationId);
  }

  /**
   * Verify TOTP MFA for privileged administrator accounts (FR-AUTH-008)
   */
  @Public()
  @Post('auth/mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() dto: VerifyMfaDto, @Req() req: AuthenticatedRequest) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const correlationId = req.correlationId || 'unknown';

    return this.authService.verifyMfa(dto, ip, correlationId);
  }

  /**
   * Token refresh endpoint with rotation (FR-AUTH-007)
   */
  @Public()
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: AuthenticatedRequest) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const correlationId = req.correlationId || 'unknown';

    return this.authService.refresh(dto, ip, correlationId);
  }

  /**
   * End session and revoke tokens (FR-AUTH-006, FR-AUTH-007)
   */
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Req() req: AuthenticatedRequest) {
    const correlationId = req.correlationId || 'unknown';
    const jti = user?.jti;

    return this.authService.logout(user.sub, jti, correlationId);
  }

  /**
   * Admin-initiated candidate password reset without exposing old password (FR-AUTH-005, Rule 7)
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/candidates/:id/password-reset')
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(
    @Param('id') candidateId: string,
    @Body() dto: AdminPasswordResetDto,
    @CurrentUser('sub') adminUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.authService.adminResetPassword(adminUserId, candidateId, dto, correlationId);
  }

  /**
   * Admin-initiated candidate account deactivation (FR-AUTH-006, Rule 7)
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('admin/candidates/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(
    @Param('id') candidateId: string,
    @Body() dto: DeactivateAccountDto,
    @CurrentUser('sub') adminUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.authService.deactivateAccount(adminUserId, candidateId, dto, correlationId);
  }

  /**
   * Audit search for authorized administrators (FR-AUD-001, FR-ADMIN-001)
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get('admin/audit-logs')
  async getAuditLogs(
    @Query('actorUserId') actorUserId?: string,
    @Query('eventType') eventType?: string,
    @Query('correlationId') correlationId?: string,
  ) {
    return this.auditService.getAuditLogs({
      actorUserId,
      eventType,
      correlationId,
    });
  }
}
