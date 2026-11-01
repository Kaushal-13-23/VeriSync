import { Injectable } from '@nestjs/common';

export interface LockoutStatus {
  locked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
}

/**
 * In-memory rate limiting and account lockout service (FR-AUTH-004, TC17).
 * Applies temporary restriction following repeated credential failures.
 */
@Injectable()
export class RateLimiterService {
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDurationSeconds = 15 * 60; // 15 minutes lockout

  // Map of identifier (username, candidate ID, or IP) -> attempt tracking
  private readonly tracker = new Map<string, { count: number; lockedUntil?: number }>();

  /**
   * Checks if the given identifier is currently under temporary lockout.
   */
  isLocked(identifier: string): LockoutStatus {
    const key = identifier.toLowerCase().trim();
    const entry = this.tracker.get(key);

    if (!entry) {
      return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
    }

    const now = Date.now();
    if (entry.lockedUntil && entry.lockedUntil > now) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return {
        locked: true,
        remainingSeconds,
        failedAttempts: entry.count,
      };
    }

    // Lockout has expired; clear expired lock
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      this.tracker.delete(key);
      return { locked: false, remainingSeconds: 0, failedAttempts: 0 };
    }

    return {
      locked: false,
      remainingSeconds: 0,
      failedAttempts: entry.count,
    };
  }

  /**
   * Records a failed login attempt. If threshold is reached, locks the account.
   */
  recordFailedAttempt(identifier: string): LockoutStatus {
    const key = identifier.toLowerCase().trim();
    const entry = this.tracker.get(key) || { count: 0 };

    entry.count += 1;

    if (entry.count >= this.maxFailedAttempts) {
      entry.lockedUntil = Date.now() + this.lockoutDurationSeconds * 1000;
      this.tracker.set(key, entry);
      return {
        locked: true,
        remainingSeconds: this.lockoutDurationSeconds,
        failedAttempts: entry.count,
      };
    }

    this.tracker.set(key, entry);
    return {
      locked: false,
      remainingSeconds: 0,
      failedAttempts: entry.count,
    };
  }

  /**
   * Resets failed login attempts upon successful credential verification.
   */
  resetAttempts(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    this.tracker.delete(key);
  }
}
