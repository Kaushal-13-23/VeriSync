/**
 * Local Structured Logger for VeriSync Candidate Desktop
 * Non-Negotiable Rules & SRS Requirements:
 * - Rule 5: No secrets, passwords or tokens in code, logs or audit metadata (FR-AUD-007).
 * - Rule 9: Timestamps are UTC ISO-8601 with correlation IDs.
 * - NFR-MNT-005: Structured logging with trace context.
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export function redactSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    return data
      .replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(
        /(password|token|secret|api[-_]?key)\s*[:=]\s*["']?[^"',\s]+["']?/gi,
        '$1=[REDACTED]',
      )
      .replace(/([A-Fa-f0-9]{32,}|[A-Za-z0-9_-]{32,})/g, (m) => m.slice(0, 4) + '...[REDACTED]');
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('auth') ||
        lower.includes('credential')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(val);
      }
    }
    return sanitized;
  }

  return data;
}

class LocalLogger {
  public async log(
    level: 'info' | 'warn' | 'error',
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const cleanMessage = String(redactSensitiveData(message));
    const cleanMetadata = metadata
      ? (redactSensitiveData(metadata) as Record<string, unknown>)
      : undefined;

    if (typeof window !== 'undefined' && window.verisyncBridge?.writeLog) {
      try {
        await window.verisyncBridge.writeLog({
          level,
          message: cleanMessage,
          correlationId,
          metadata: cleanMetadata,
        });
      } catch {
        // Fallback below
      }
    }

    // Console logging in development
    const prefix = `[VeriSync-${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(
        prefix,
        cleanMessage,
        correlationId ? `[correlationId: ${correlationId}]` : '',
        cleanMetadata || '',
      );
    } else if (level === 'warn') {
      console.warn(
        prefix,
        cleanMessage,
        correlationId ? `[correlationId: ${correlationId}]` : '',
        cleanMetadata || '',
      );
    } else {
      console.log(
        prefix,
        cleanMessage,
        correlationId ? `[correlationId: ${correlationId}]` : '',
        cleanMetadata || '',
      );
    }
  }

  public async info(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.log('info', message, correlationId, metadata);
  }

  public async warn(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.log('warn', message, correlationId, metadata);
  }

  public async error(
    message: string,
    correlationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.log('error', message, correlationId, metadata);
  }
}

export const logger = new LocalLogger();
