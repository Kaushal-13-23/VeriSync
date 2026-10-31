import { describe, it, expect } from 'vitest';
import { redactSensitiveData } from './logger';

describe('Local Logger & Sensitive Data Redaction (Rule 5, FR-AUD-007, NFR-MNT-005)', () => {
  it('redacts password, token, and secret fields in strings', () => {
    const rawString = 'Login attempt password=SuperSecret123! token=jwt.xyz.123';
    const redacted = redactSensitiveData(rawString) as string;

    expect(redacted).not.toContain('SuperSecret123!');
    expect(redacted).not.toContain('jwt.xyz.123');
    expect(redacted).toContain('password=[REDACTED]');
  });

  it('redacts Bearer authorization header values', () => {
    const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const redacted = redactSensitiveData(raw) as string;

    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(redacted).toContain('Bearer [REDACTED]');
  });

  it('redacts sensitive object keys recursively', () => {
    const rawObj = {
      user: 'CAN-2026-001',
      password: 'PlainPassword123',
      nested: {
        authToken: 'secret-token-val',
        status: 'active',
      },
    };

    const sanitized = redactSensitiveData(rawObj) as Record<string, unknown>;

    expect(sanitized.user).toBe('CAN-2026-001');
    expect(sanitized.password).toBe('[REDACTED]');
    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.authToken).toBe('[REDACTED]');
    expect(nested.status).toBe('active');
  });
});
