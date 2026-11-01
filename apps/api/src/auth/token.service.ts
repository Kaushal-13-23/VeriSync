import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  tokenVersion: number;
  jti?: string;
  type: 'access' | 'refresh' | 'mfa';
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly memoryRevocationSet = new Set<string>();

  private readonly accessSecret =
    process.env.JWT_ACCESS_SECRET ||
    'verisync_dev_access_secret_do_not_use_in_prod_64_characters_min!';
  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    'verisync_dev_refresh_secret_do_not_use_in_prod_64_characters_min!';

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates short-lived access token (default 15 minutes) per FR-AUTH-007.
   */
  async generateAccessToken(user: {
    id: string;
    username: string;
    role: UserRole;
    tokenVersion: number;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      type: 'access',
    };

    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as any) || '15m',
    });
  }

  /**
   * Generates refresh token with unique jti (default 7 days) per FR-AUTH-007.
   */
  async generateRefreshToken(user: {
    id: string;
    username: string;
    role: UserRole;
    tokenVersion: number;
  }): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      jti,
      type: 'refresh',
    };

    const token = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
    });

    return { token, jti };
  }

  /**
   * Generates temporary intermediate token for MFA challenge.
   */
  async generateMfaChallengeToken(user: {
    id: string;
    username: string;
    role: UserRole;
  }): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      type: 'mfa',
    };

    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: '5m',
    });
  }

  /**
   * Verifies access token.
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.accessSecret,
    });
  }

  /**
   * Verifies refresh token.
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.refreshSecret,
    });
  }

  /**
   * Revokes a specific token by JTI (e.g. on logout) (FR-AUTH-006, FR-AUTH-007).
   */
  async revokeToken(jti: string, userId: string, expiresAt: Date): Promise<void> {
    this.memoryRevocationSet.add(jti);
    try {
      if (this.prisma && this.prisma.revokedToken) {
        await this.prisma.revokedToken.upsert({
          where: { jti },
          update: {},
          create: {
            jti,
            userId,
            expiresAt,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed persisting token revocation to DB: ${err.message}`);
    }
  }

  /**
   * Checks if token JTI is revoked or if user's tokenVersion has been bumped.
   */
  async isTokenRevoked(
    jti: string | undefined,
    userId: string,
    tokenVersion: number,
  ): Promise<boolean> {
    if (jti && this.memoryRevocationSet.has(jti)) {
      return true;
    }

    try {
      if (this.prisma && this.prisma.revokedToken && jti) {
        const found = await this.prisma.revokedToken.findUnique({
          where: { jti },
        });
        if (found) return true;
      }

      if (this.prisma && this.prisma.user) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { tokenVersion: true, accountStatus: true },
        });

        if (!user || user.accountStatus !== 'ACTIVE') {
          return true; // Revoked if user not found or inactive
        }

        if (tokenVersion < user.tokenVersion) {
          return true; // Revoked due to session revocation / password reset / deactivation
        }
      }
    } catch {
      // Fallback to memory
    }

    return false;
  }
}
