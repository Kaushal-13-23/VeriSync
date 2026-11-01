import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Service for cryptographic operations using Argon2id (FR-AUTH-003, Rule 5, NFR-SEC-002).
 */
@Injectable()
export class PasswordService {
  private readonly argon2Options: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB OWASP recommendation
    timeCost: 3, // 3 iterations
    parallelism: 1,
  };

  /**
   * Hashes plaintext password strictly using Argon2id.
   * Plaintext passwords are never logged or stored.
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.argon2Options);
  }

  /**
   * Authoritatively verifies password against an Argon2id hash.
   */
  async verifyPassword(hash: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      return false;
    }
  }
}
