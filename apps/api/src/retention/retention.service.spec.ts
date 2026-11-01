import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from './retention.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('RetentionService (FR-CODE-014, SRS 9.3)', () => {
  let service: RetentionService;

  const mockSettingsStore: Record<string, string> = {
    source_code_retention_days: '60',
    result_retention_days: '180',
    auto_purge_enabled: 'true',
  };

  const mockPrismaService = {
    systemSetting: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (mockSettingsStore[where.key]) {
          return Promise.resolve({ key: where.key, value: mockSettingsStore[where.key] });
        }
        return Promise.resolve(null);
      }),
      upsert: jest.fn().mockImplementation(({ where, update, create }) => {
        const val = update?.value || create?.value;
        mockSettingsStore[where.key] = val;
        return Promise.resolve({ key: where.key, value: val });
      }),
    },
    codingSubmission: {
      deleteMany: jest.fn().mockResolvedValue({ count: 7 }),
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
  });

  it('should return configured retention settings', async () => {
    const settings = await service.getSettings();
    expect(settings.sourceCodeRetentionDays).toBe(60);
    expect(settings.resultRetentionDays).toBe(180);
    expect(settings.autoPurgeEnabled).toBe(true);
  });

  it('should update retention settings and write audit log', async () => {
    const updated = await service.updateSettings(
      'admin-1',
      { sourceCodeRetentionDays: 90, resultRetentionDays: 365, autoPurgeEnabled: false },
      'corr-retention',
      '127.0.0.1',
    );

    expect(updated.sourceCodeRetentionDays).toBe(90);
    expect(updated.resultRetentionDays).toBe(365);
    expect(updated.autoPurgeEnabled).toBe(false);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UPDATE_RETENTION_SETTINGS',
      }),
    );
  });

  it('should purge expired submissions and write audit log', async () => {
    const result = await service.purgeExpiredSubmissions('admin-1', 'corr-purge');
    expect(result.purgedSubmissionsCount).toBe(7);
    expect(result.purgedAt).toBeDefined();
    expect(mockPrismaService.codingSubmission.deleteMany).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PURGE_RETENTION_RECORDS',
      }),
    );
  });
});
