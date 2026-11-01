import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RateLimiterService } from './rate-limiter.service';
import { MfaService } from './mfa.service';
import { AuditService } from '../audit/audit.service';
import {
  LoginDto,
  VerifyMfaDto,
  RefreshTokenDto,
  AdminPasswordResetDto,
  DeactivateAccountDto,
} from './dto/auth.dto';
import { ApiErrorException } from '../common/api-error.exception';
import { ApiErrorCode } from '@verisync/shared';
import { UserRole, AccountStatus, AuditOutcome } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rateLimiter: RateLimiterService,
    private readonly mfaService: MfaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Unified Login for SuperAdmin, Technical Evaluator, and Candidate (FR-AUTH-001, FR-AUTH-002, Decision 3).
   * Accepts candidate ID (e.g. CAN-2026-081) or username.
   */
  async login(dto: LoginDto, ip: string, userAgent: string, correlationId: string) {
    const identifier = dto.identifier.trim();

    // 1. Rate Limiting & Temporary Lockout Check (FR-AUTH-004, TC17)
    const lockout = this.rateLimiter.isLocked(identifier);
    if (lockout.locked) {
      await this.auditService.log({
        actorUserId: null,
        eventType: 'AUTH_LOGIN_RATE_LIMITED',
        affectedEntity: `user:${identifier}`,
        outcome: AuditOutcome.DENIED,
        correlationId,
        metadata: {
          identifier,
          ip,
          remainingSeconds: lockout.remainingSeconds,
          reason: 'Temporary lockout triggered by repeated failed attempts',
        },
      });

      throw new ApiErrorException(
        ApiErrorCode.RATE_LIMITED,
        `Account temporarily locked due to repeated failed logins. Try again in ${lockout.remainingSeconds} seconds.`,
        { retryAfterSeconds: lockout.remainingSeconds },
      );
    }

    // 2. Identify User by Username or Candidate ID (Decision 3, FR-AUTH-002)
    let user = await this.prisma.user.findUnique({
      where: { username: identifier },
      include: { candidateProfile: true },
    });

    if (!user) {
      const profile = await this.prisma.candidateProfile.findUnique({
        where: { candidateIdentifier: identifier },
        include: { user: { include: { candidateProfile: true } } },
      });
      if (profile && profile.user) {
        user = profile.user;
      }
    }

    // 3. User Not Found Handling
    if (!user) {
      const failStatus = this.rateLimiter.recordFailedAttempt(identifier);

      await this.auditService.log({
        actorUserId: null,
        eventType: 'AUTH_LOGIN_FAILED',
        affectedEntity: `user:${identifier}`,
        outcome: AuditOutcome.FAILURE,
        correlationId,
        metadata: {
          identifier,
          ip,
          failedAttempts: failStatus.failedAttempts,
          reason: 'User record not found',
        },
      });

      if (failStatus.locked) {
        throw new ApiErrorException(
          ApiErrorCode.RATE_LIMITED,
          `Too many failed attempts. Temporary lockout engaged for ${failStatus.remainingSeconds} seconds.`,
          { retryAfterSeconds: failStatus.remainingSeconds },
        );
      }

      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Invalid username/candidate ID or password',
      );
    }

    // 4. Account Status Validation (FR-AUTH-006)
    if (user.accountStatus === AccountStatus.INACTIVE) {
      await this.auditService.log({
        actorUserId: user.id,
        eventType: 'AUTH_LOGIN_BLOCKED_INACTIVE',
        affectedEntity: `user:${user.id}`,
        outcome: AuditOutcome.DENIED,
        correlationId,
        metadata: { identifier, ip, accountStatus: user.accountStatus },
      });

      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Account has been deactivated. Please contact your assessment coordinator.',
      );
    }

    if (user.accountStatus === AccountStatus.LOCKED) {
      await this.auditService.log({
        actorUserId: user.id,
        eventType: 'AUTH_LOGIN_BLOCKED_LOCKED',
        affectedEntity: `user:${user.id}`,
        outcome: AuditOutcome.DENIED,
        correlationId,
        metadata: { identifier, ip, accountStatus: user.accountStatus },
      });

      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Account is administratively locked.',
      );
    }

    // 5. Authoritative Argon2id Password Verification (FR-AUTH-003, Rule 5)
    const isPasswordValid = await this.passwordService.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      const failStatus = this.rateLimiter.recordFailedAttempt(identifier);

      await this.auditService.log({
        actorUserId: user.id,
        eventType: 'AUTH_LOGIN_FAILED',
        affectedEntity: `user:${user.id}`,
        outcome: AuditOutcome.FAILURE,
        correlationId,
        metadata: {
          identifier,
          ip,
          failedAttempts: failStatus.failedAttempts,
          reason: 'Invalid password credentials',
        },
      });

      if (failStatus.locked) {
        await this.auditService.log({
          actorUserId: user.id,
          eventType: 'AUTH_ACCOUNT_LOCKOUT_ENGAGED',
          affectedEntity: `user:${user.id}`,
          outcome: AuditOutcome.DENIED,
          correlationId,
          metadata: { identifier, ip, lockoutSeconds: failStatus.remainingSeconds },
        });

        throw new ApiErrorException(
          ApiErrorCode.RATE_LIMITED,
          `Too many failed attempts. Temporary lockout engaged for ${failStatus.remainingSeconds} seconds.`,
          { retryAfterSeconds: failStatus.remainingSeconds },
        );
      }

      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Invalid username/candidate ID or password',
      );
    }

    // 6. Credentials Valid -> Reset rate limiter counters
    this.rateLimiter.resetAttempts(identifier);

    // 7. Multi-Factor Authentication Check for Privileged Roles (FR-AUTH-008)
    if (user.role === UserRole.SUPER_ADMIN && user.totpEnabled) {
      const mfaToken = await this.tokenService.generateMfaChallengeToken(user);

      await this.auditService.log({
        actorUserId: user.id,
        eventType: 'AUTH_MFA_CHALLENGE_ISSUED',
        affectedEntity: `user:${user.id}`,
        outcome: AuditOutcome.SUCCESS,
        correlationId,
        metadata: { ip, role: user.role },
      });

      return {
        mfaRequired: true,
        mfaToken,
      };
    }

    // 8. Generate Authoritative Access & Refresh Tokens (FR-AUTH-007)
    const accessToken = await this.tokenService.generateAccessToken(user);
    const { token: refreshToken } = await this.tokenService.generateRefreshToken(user);

    await this.auditService.log({
      actorUserId: user.id,
      eventType: 'AUTH_LOGIN_SUCCESS',
      affectedEntity: `user:${user.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        username: user.username,
        role: user.role,
        ip,
        userAgent,
      },
    });

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        candidateProfile: user.candidateProfile
          ? {
              candidateId: user.candidateProfile.id,
              candidateIdentifier: user.candidateProfile.candidateIdentifier,
              fullName: user.candidateProfile.fullName,
              email: user.candidateProfile.email,
              institution: user.candidateProfile.institution,
            }
          : undefined,
      },
    };
  }

  /**
   * Verify TOTP code for MFA challenge (FR-AUTH-008).
   */
  async verifyMfa(dto: VerifyMfaDto, ip: string, correlationId: string) {
    let payload;
    try {
      payload = await this.tokenService.verifyAccessToken(dto.mfaToken);
    } catch {
      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'MFA verification challenge token expired or invalid',
      );
    }

    if (payload.type !== 'mfa') {
      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Invalid token context for MFA verification',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.totpSecret) {
      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'MFA is not configured for this account',
      );
    }

    const isCodeValid = this.mfaService.verifyTotp(dto.code, user.totpSecret);
    if (!isCodeValid) {
      await this.auditService.log({
        actorUserId: user.id,
        eventType: 'AUTH_MFA_FAILED',
        affectedEntity: `user:${user.id}`,
        outcome: AuditOutcome.FAILURE,
        correlationId,
        metadata: { ip, reason: 'Invalid TOTP code' },
      });

      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Invalid multi-factor authentication code',
      );
    }

    const accessToken = await this.tokenService.generateAccessToken(user);
    const { token: refreshToken } = await this.tokenService.generateRefreshToken(user);

    await this.auditService.log({
      actorUserId: user.id,
      eventType: 'AUTH_MFA_SUCCESS',
      affectedEntity: `user:${user.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: { ip, role: user.role },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Refresh token rotation (FR-AUTH-007).
   */
  async refresh(dto: RefreshTokenDto, ip: string, correlationId: string) {
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new ApiErrorException(ApiErrorCode.UNAUTHENTICATED, 'Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new ApiErrorException(
        ApiErrorCode.UNAUTHENTICATED,
        'Token is not a valid refresh token',
      );
    }

    const isRevoked = await this.tokenService.isTokenRevoked(
      payload.jti,
      payload.sub,
      payload.tokenVersion,
    );

    if (isRevoked) {
      await this.auditService.log({
        actorUserId: payload.sub,
        eventType: 'AUTH_REFRESH_TOKEN_REJECTED_REVOKED',
        affectedEntity: `user:${payload.sub}`,
        outcome: AuditOutcome.DENIED,
        correlationId,
        metadata: { jti: payload.jti, ip },
      });

      throw new ApiErrorException(ApiErrorCode.UNAUTHENTICATED, 'Refresh token has been revoked');
    }

    // Revoke old refresh token JTI immediately upon use (rotation)
    if (payload.jti) {
      await this.tokenService.revokeToken(
        payload.jti,
        payload.sub,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ApiErrorException(ApiErrorCode.UNAUTHENTICATED, 'User account is no longer active');
    }

    const newAccessToken = await this.tokenService.generateAccessToken(user);
    const { token: newRefreshToken } = await this.tokenService.generateRefreshToken(user);

    await this.auditService.log({
      actorUserId: user.id,
      eventType: 'AUTH_TOKEN_REFRESH_SUCCESS',
      affectedEntity: `user:${user.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: { ip },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout and server-side token revocation (FR-AUTH-006, FR-AUTH-007).
   */
  async logout(userId: string, jti: string | undefined, correlationId: string) {
    if (jti) {
      await this.tokenService.revokeToken(
        jti,
        userId,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );
    }

    await this.auditService.log({
      actorUserId: userId,
      eventType: 'AUTH_LOGOUT_SUCCESS',
      affectedEntity: `user:${userId}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: { jti },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Admin-initiated candidate password reset without exposing old password (FR-AUTH-005, Rule 7).
   */
  async adminResetPassword(
    adminUserId: string,
    candidateUserIdOrId: string,
    dto: AdminPasswordResetDto,
    correlationId: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { id: candidateUserIdOrId },
    });

    if (!user) {
      const profile = await this.prisma.candidateProfile.findUnique({
        where: { id: candidateUserIdOrId },
        include: { user: true },
      });
      if (profile && profile.user) {
        user = profile.user;
      }
    }

    if (!user) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Target candidate user record not found',
      );
    }

    const newHash = await this.passwordService.hashPassword(dto.newPassword);

    // Bump tokenVersion to invalidate all existing sessions instantly
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    // Reset rate limiter for this user
    this.rateLimiter.resetAttempts(user.username);

    // Audited with reason and actor (Rule 7, FR-AUTH-005) - zero passwords logged
    await this.auditService.log({
      actorUserId: adminUserId,
      eventType: 'ADMIN_CANDIDATE_PASSWORD_RESET',
      affectedEntity: `user:${user.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        targetUserId: user.id,
        targetUsername: user.username,
        sessionsRevoked: true,
      },
    });

    return {
      success: true,
      message: 'Candidate password reset successfully and active sessions revoked.',
    };
  }

  /**
   * Admin-initiated account deactivation (FR-AUTH-006, Rule 7).
   */
  async deactivateAccount(
    adminUserId: string,
    targetUserIdOrId: string,
    dto: DeactivateAccountDto,
    correlationId: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { id: targetUserIdOrId },
    });

    if (!user) {
      const profile = await this.prisma.candidateProfile.findUnique({
        where: { id: targetUserIdOrId },
        include: { user: true },
      });
      if (profile && profile.user) {
        user = profile.user;
      }
    }

    if (!user) {
      throw new ApiErrorException(ApiErrorCode.INVALID_STATE, 'Target user account not found');
    }

    // Mark INACTIVE and increment tokenVersion to revoke all sessions immediately
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        accountStatus: AccountStatus.INACTIVE,
        tokenVersion: { increment: 1 },
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      eventType: 'ADMIN_ACCOUNT_DEACTIVATED',
      affectedEntity: `user:${user.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        targetUserId: user.id,
        targetUsername: user.username,
        reason: dto.reason,
      },
    });

    return {
      success: true,
      message: `Account ${user.username} deactivated and all active sessions revoked.`,
    };
  }
}
