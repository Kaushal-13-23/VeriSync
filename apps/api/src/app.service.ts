import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HealthStatusResponse } from '@verisync/shared';
import { PrismaService } from './common/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello from VeriSync API (Phase 7 Production Ready)';
  }

  async getHealth(): Promise<HealthStatusResponse> {
    const mem = process.memoryUsage();
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let dbLatencyMs = 0;

    const start = Date.now();
    try {
      if (this.prisma && typeof (this.prisma as any).$queryRawUnsafe === 'function') {
        await this.prisma.$queryRawUnsafe('SELECT 1');
        dbLatencyMs = Date.now() - start;
      }
    } catch {
      dbStatus = 'disconnected';
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      serverTime: new Date().toISOString(), // UTC ISO-8601 per Rule 9
      version: '1.1.0',
      uptimeSeconds,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }

  async getReadiness(): Promise<HealthStatusResponse> {
    const health = await this.getHealth();
    if (health.database?.status === 'disconnected') {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is not reachable. Readiness probe failed.',
        details: health,
      });
    }
    return health;
  }

  getLiveness(): HealthStatusResponse {
    return {
      status: 'ok',
      serverTime: new Date().toISOString(),
      version: '1.1.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async getPrometheusMetrics(): Promise<string> {
    const mem = process.memoryUsage();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    let activeSessionsCount = 0;
    let auditLogEntriesCount = 0;

    try {
      if (this.prisma && this.prisma.assessmentSession) {
        activeSessionsCount = await this.prisma.assessmentSession.count({
          where: { sessionStatus: 'ACTIVE' },
        });
      }
      if (this.prisma && this.prisma.auditLog) {
        auditLogEntriesCount = await this.prisma.auditLog.count();
      }
    } catch {
      // Offline fallback
    }

    return [
      '# HELP verisync_app_uptime_seconds Process uptime in seconds',
      '# TYPE verisync_app_uptime_seconds counter',
      `verisync_app_uptime_seconds ${uptime}`,
      '',
      '# HELP verisync_nodejs_heap_used_bytes Node.js memory heap used in bytes',
      '# TYPE verisync_nodejs_heap_used_bytes gauge',
      `verisync_nodejs_heap_used_bytes ${mem.heapUsed}`,
      '',
      '# HELP verisync_nodejs_heap_total_bytes Node.js memory heap total in bytes',
      '# TYPE verisync_nodejs_heap_total_bytes gauge',
      `verisync_nodejs_heap_total_bytes ${mem.heapTotal}`,
      '',
      '# HELP verisync_nodejs_rss_bytes Node.js resident set size in bytes',
      '# TYPE verisync_nodejs_rss_bytes gauge',
      `verisync_nodejs_rss_bytes ${mem.rss}`,
      '',
      '# HELP verisync_active_assessment_sessions Current number of active candidate exam sessions',
      '# TYPE verisync_active_assessment_sessions gauge',
      `verisync_active_assessment_sessions ${activeSessionsCount}`,
      '',
      '# HELP verisync_audit_log_entries_total Total number of append-only audit log rows recorded',
      '# TYPE verisync_audit_log_entries_total counter',
      `verisync_audit_log_entries_total ${auditLogEntriesCount}`,
      '',
    ].join('\n');
  }
}
