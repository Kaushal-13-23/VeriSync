import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, GENESIS_AUDIT_HASH } from './audit.service';
import { PrismaService } from '../common/prisma.service';
import { AuditOutcome } from '@verisync/shared';

describe('Audit Tamper-Evidence & SHA-256 Hash Chaining (FR-AUD-004, NFR-SEC-009)', () => {
  let service: AuditService;
  let mockLogs: any[] = [];

  const mockPrisma = {
    auditLog: {
      findFirst: jest.fn().mockImplementation(async () => {
        if (mockLogs.length === 0) return null;
        return { currentHash: mockLogs[mockLogs.length - 1].currentHash };
      }),
      findMany: jest.fn().mockImplementation(async () => {
        return [...mockLogs];
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: `audit_db_${mockLogs.length + 1}`,
          ...data,
          eventTimestamp: data.eventTimestamp || new Date(),
        };
        mockLogs.push(record);
        return record;
      }),
    },
  };

  beforeEach(async () => {
    mockLogs = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should initialize the genesis audit log with 64 zeros as previousHash', async () => {
    const entry1 = await service.log({
      actorUserId: 'admin-1',
      eventType: 'SYSTEM_STARTUP',
      affectedEntity: 'system',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-001',
      metadata: { bootTime: '2026-11-01T00:00:00Z' },
    });

    expect(entry1.previousHash).toBe(GENESIS_AUDIT_HASH);
    expect(entry1.currentHash).toBeDefined();
    expect(entry1.currentHash).toHaveLength(64); // SHA-256 hex digest
  });

  it('should cryptographically chain subsequent entries to previousHash', async () => {
    const entry1 = await service.log({
      actorUserId: 'admin-1',
      eventType: 'DEVICE_REGISTERED',
      affectedEntity: 'device:1',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-chain-1',
      metadata: { device: 'LAB-01' },
    });

    const entry2 = await service.log({
      actorUserId: 'proctor-1',
      eventType: 'DEVICE_ACTIVATED',
      affectedEntity: 'device:1',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-chain-2',
      metadata: { device: 'LAB-01' },
    });

    const entry3 = await service.log({
      actorUserId: 'candidate-1',
      eventType: 'SESSION_STARTED',
      affectedEntity: 'session:1',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-chain-3',
      metadata: { candidateId: 'CAN-001' },
    });

    expect(entry1.previousHash).toBe(GENESIS_AUDIT_HASH);
    expect(entry2.previousHash).toBe(entry1.currentHash);
    expect(entry3.previousHash).toBe(entry2.currentHash);
  });

  it('should verify audit chain integrity successfully when untampered', async () => {
    for (let i = 1; i <= 5; i++) {
      await service.log({
        actorUserId: `user-${i}`,
        eventType: `TEST_EVENT_${i}`,
        affectedEntity: `entity:${i}`,
        outcome: AuditOutcome.SUCCESS,
        correlationId: `corr-verify-${i}`,
        metadata: { index: i },
      });
    }

    const verification = await service.verifyAuditChainIntegrity();
    expect(verification.valid).toBe(true);
    expect(verification.totalEntries).toBe(5);
    expect(verification.brokenEntryId).toBeUndefined();
  });

  it('should detect unauthorized row modification / tampering (altered metadata)', async () => {
    await service.log({
      actorUserId: 'admin-1',
      eventType: 'SCORE_CORRECTION',
      affectedEntity: 'assessment:1',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-tamper-1',
      metadata: { originalScore: 60, correctedScore: 85, reason: 'Valid dispute' },
    });

    await service.log({
      actorUserId: 'admin-1',
      eventType: 'RESULT_PUBLISHED',
      affectedEntity: 'assessment:1',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-tamper-2',
      metadata: { published: true },
    });

    // An attacker alters the metadata of entry 1 directly in the database
    mockLogs[0].metadata = { originalScore: 60, correctedScore: 100, reason: 'Corrupted' };

    const verification = await service.verifyAuditChainIntegrity();
    expect(verification.valid).toBe(false);
    expect(verification.brokenEntryId).toBe(mockLogs[0].id);
  });

  it('should detect unauthorized row modification / tampering (altered previousHash)', async () => {
    await service.log({
      actorUserId: 'admin-1',
      eventType: 'EVENT_A',
      affectedEntity: 'entity:A',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-prev-1',
      metadata: {},
    });

    await service.log({
      actorUserId: 'admin-1',
      eventType: 'EVENT_B',
      affectedEntity: 'entity:B',
      outcome: AuditOutcome.SUCCESS,
      correlationId: 'corr-prev-2',
      metadata: {},
    });

    // Attacker modifies previousHash of entry 2
    mockLogs[1].previousHash = '0000000000000000000000000000000000000000000000000000000000000001';

    const verification = await service.verifyAuditChainIntegrity();
    expect(verification.valid).toBe(false);
    expect(verification.brokenEntryId).toBe(mockLogs[1].id);
  });

  it('should detect unauthorized deletion of an intermediate audit row', async () => {
    for (let i = 1; i <= 4; i++) {
      await service.log({
        actorUserId: `user-${i}`,
        eventType: `TRANSACTION_${i}`,
        affectedEntity: `item:${i}`,
        outcome: AuditOutcome.SUCCESS,
        correlationId: `corr-del-${i}`,
        metadata: { step: i },
      });
    }

    // Attacker deletes entry 2 (index 1) to cover tracks
    const deletedEntry = mockLogs.splice(1, 1)[0];

    const verification = await service.verifyAuditChainIntegrity();
    expect(verification.valid).toBe(false);
    // The next entry (previously index 2, now index 1) will fail because its previousHash pointed to deletedEntry.currentHash
    expect(verification.brokenEntryId).toBe(mockLogs[1].id);
  });
});
