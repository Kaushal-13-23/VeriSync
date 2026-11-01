import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma.service';

describe('AppController (SRS 12.4 Health, Metrics, Probes)', () => {
  let appController: AppController;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ '1': 1 }]),
      assessmentSession: { count: jest.fn().mockResolvedValue(42) },
      auditLog: { count: jest.fn().mockResolvedValue(1337) },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root endpoint', () => {
    it('should return hello world message', () => {
      expect(appController.getHello()).toContain('VeriSync');
    });
  });

  describe('health endpoint', () => {
    it('should return health status ok with ISO-8601 UTC timestamp and db status', async () => {
      const health = await appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.version).toBe('1.1.0');
      expect(health.database?.status).toBe('connected');
      expect(health.memory?.heapUsedMb).toBeGreaterThan(0);
      expect(new Date(health.serverTime).toISOString()).toBe(health.serverTime);
    });

    it('should pass readiness probe when db is connected', async () => {
      const ready = await appController.getReadiness();
      expect(ready.status).toBe('ok');
    });

    it('should pass liveness probe', () => {
      const live = appController.getLiveness();
      expect(live.status).toBe('ok');
    });
  });

  describe('metrics endpoint', () => {
    it('should expose Prometheus plaintext metrics with active sessions and audit logs', async () => {
      const metrics = await appController.getMetrics();
      expect(metrics).toContain('verisync_app_uptime_seconds');
      expect(metrics).toContain('verisync_active_assessment_sessions 42');
      expect(metrics).toContain('verisync_audit_log_entries_total 1337');
    });
  });
});
