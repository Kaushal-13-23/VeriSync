import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditOutcome, AuditLog } from '@prisma/client';

export interface AuditLogEntry {
  actorUserId?: string | null;
  eventType: string;
  affectedEntity: string;
  outcome: AuditOutcome;
  correlationId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly memoryLogStore: AuditLog[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes metadata by redacting secrets, passwords, tokens, and credentials (FR-AUD-006, Rule 5).
   */
  public sanitizeMetadata(data: any): any {
    if (data === null || data === undefined) return {};
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeMetadata(item));
    }

    const sanitized: Record<string, any> = {};
    const sensitivePattern = /password|secret|token|auth|bearer|cookie|credential|hash|jwt|key/i;

    for (const [key, val] of Object.entries(data)) {
      if (sensitivePattern.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizeMetadata(val);
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  /**
   * Append-only audit logger enforcing FR-AUD-001 through FR-AUD-007.
   */
  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const sanitizedMetadata = this.sanitizeMetadata(entry.metadata || {});

    const record: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      actorUserId: entry.actorUserId || null,
      eventType: entry.eventType,
      affectedEntity: entry.affectedEntity,
      eventTimestamp: new Date(),
      outcome: entry.outcome,
      correlationId: entry.correlationId || 'unknown',
      metadata: sanitizedMetadata,
    };

    try {
      if (this.prisma && this.prisma.auditLog) {
        return await this.prisma.auditLog.create({
          data: {
            actorUserId: entry.actorUserId || null,
            eventType: entry.eventType,
            affectedEntity: entry.affectedEntity,
            outcome: entry.outcome,
            correlationId: entry.correlationId || 'unknown',
            metadata: sanitizedMetadata,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Database audit log write bypassed to in-memory: ${err.message}`);
    }

    // Fallback in-memory append-only log store for test and offline environments
    this.memoryLogStore.push(record);
    return record;
  }

  /**
   * Search audit logs for administration inspection (FR-AUD-001, FR-ADMIN-001)
   */
  async getAuditLogs(filter?: {
    actorUserId?: string;
    eventType?: string;
    correlationId?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const limit = filter?.limit || 100;
    try {
      if (this.prisma && this.prisma.auditLog) {
        return await this.prisma.auditLog.findMany({
          where: {
            ...(filter?.actorUserId ? { actorUserId: filter.actorUserId } : {}),
            ...(filter?.eventType ? { eventType: filter.eventType } : {}),
            ...(filter?.correlationId ? { correlationId: filter.correlationId } : {}),
          },
          orderBy: { eventTimestamp: 'desc' },
          take: limit,
        });
      }
    } catch {
      // Fallback
    }

    return this.memoryLogStore
      .filter(
        (l) =>
          (!filter?.actorUserId || l.actorUserId === filter.actorUserId) &&
          (!filter?.eventType || l.eventType === filter.eventType) &&
          (!filter?.correlationId || l.correlationId === filter.correlationId),
      )
      .slice(-limit)
      .reverse();
  }
}
