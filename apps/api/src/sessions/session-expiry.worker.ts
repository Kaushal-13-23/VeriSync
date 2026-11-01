import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SessionsService } from './sessions.service';
import { SessionState, AttemptState } from '@verisync/shared';

@Injectable()
export class SessionExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionExpiryWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Interruption timeout threshold (60 seconds without heartbeat)
  private readonly HEARTBEAT_TIMEOUT_MS = 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
  ) {}

  onModuleInit() {
    // Run background expiry checks every 2 seconds (NFR-PERF-004)
    this.timer = setInterval(() => {
      this.processExpirations().catch((err) => {
        this.logger.error(`Error in session expiry background worker: ${err.message}`, err.stack);
      });
    }, 2000);
    if (this.timer.unref) {
      this.timer.unref();
    }
    this.logger.log('SessionExpiryWorker started (2s interval).');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('SessionExpiryWorker stopped.');
    }
  }

  /**
   * Evaluates expired sessions, timed-out questions, and lost heartbeats (FR-TIME-004..007, BR-010)
   */
  async processExpirations(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;
    let processedCount = 0;

    try {
      const now = new Date();

      // 1. Process sessions where overall deadline has passed
      const expiredSessions = await this.prisma.assessmentSession.findMany({
        where: {
          sessionStatus: { in: [SessionState.ACTIVE, SessionState.INTERRUPTED] },
          overallDeadline: { lte: now },
        },
        select: { id: true },
      });

      for (const session of expiredSessions) {
        await this.sessionsService.processSessionExpirations(session.id, now);
        processedCount++;
      }

      // 2. Process active question attempts where question deadline has passed
      const expiredAttempts = await this.prisma.questionAttempt.findMany({
        where: {
          attemptStatus: AttemptState.ACTIVE,
          deadlineAt: { lte: now },
        },
        select: { sessionId: true },
        distinct: ['sessionId'],
      });

      for (const attempt of expiredAttempts) {
        await this.sessionsService.processSessionExpirations(attempt.sessionId, now);
        processedCount++;
      }

      // 3. Detect lost heartbeats and transition session to INTERRUPTED (BR-010, UC-12)
      const heartbeatCutoff = new Date(now.getTime() - this.HEARTBEAT_TIMEOUT_MS);
      const lostHeartbeatSessions = await this.prisma.assessmentSession.findMany({
        where: {
          sessionStatus: SessionState.ACTIVE,
          lastHeartbeatAt: { lte: heartbeatCutoff },
        },
        select: { id: true },
      });

      for (const session of lostHeartbeatSessions) {
        await this.prisma.assessmentSession.update({
          where: { id: session.id },
          data: { sessionStatus: SessionState.INTERRUPTED },
        });
        processedCount++;
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}
