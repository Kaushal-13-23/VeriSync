import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

/**
 * Multi-factor authentication service using RFC 6238 TOTP (FR-AUTH-008).
 */
@Injectable()
export class MfaService {
  /**
   * Generates a new TOTP secret for privileged administrator onboarding.
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generates otpauth:// URI for authenticator applications.
   */
  generateKeyUri(username: string, secret: string): string {
    return authenticator.keyuri(username, 'VeriSync Admin', secret);
  }

  /**
   * Verifies TOTP code against administrator's secret.
   */
  verifyTotp(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    try {
      return authenticator.check(token.trim(), secret);
    } catch {
      return false;
    }
  }
}
