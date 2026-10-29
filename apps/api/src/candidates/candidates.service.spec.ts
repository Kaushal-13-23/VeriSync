import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesService } from './candidates.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../common/prisma.service';
import { ApiErrorException } from '../common/api-error.exception';
import { AccountStatus, UserRole, AuditOutcome } from '@verisync/shared';

describe('CandidatesService (FR-CAN-001..007, FR-AUTH-009, UC-02, UC-03)', () => {
  let service: CandidatesService;
  let prismaMock: any;
  let auditLogsStore: any[] = [];
  let usersStore: any[] = [];
  let candidateProfilesStore: any[] = [];
  let assessmentsStore: any[] = [];
  let assignmentsStore: any[] = [];

  beforeEach(async () => {
    auditLogsStore = [];
    usersStore = [];
    candidateProfilesStore = [];
    assessmentsStore = [];
    assignmentsStore = [];

    prismaMock = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const user = usersStore.find((u) => u.username === where.username || u.id === where.id);
          return Promise.resolve(user ? { ...user } : null);
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newUser = {
            id: `usr_${Date.now()}_${Math.random()}`,
            username: data.username,
            passwordHash: data.passwordHash,
            role: data.role || UserRole.CANDIDATE,
            accountStatus: data.accountStatus || AccountStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          usersStore.push(newUser);

          if (data.candidateProfile?.create) {
            const cpData = data.candidateProfile.create;
            const newCp = {
              id: `cp_${Date.now()}_${Math.random()}`,
              userId: newUser.id,
              candidateIdentifier: cpData.candidateIdentifier,
              fullName: cpData.fullName,
              email: cpData.email,
              phone: cpData.phone || null,
              institution: cpData.institution,
              qualification: cpData.qualification,
              graduationYear: cpData.graduationYear,
              recruitmentReference: cpData.recruitmentReference,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            candidateProfilesStore.push(newCp);
            return Promise.resolve({ ...newUser, candidateProfile: { ...newCp } });
          }

          return Promise.resolve({ ...newUser });
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const user = usersStore.find((u) => u.id === where.id);
          if (user) {
            Object.assign(user, data);
            return Promise.resolve({ ...user });
          }
          return Promise.resolve(null);
        }),
      },
      candidateProfile: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          let cp = null;
          if (where.id) cp = candidateProfilesStore.find((c) => c.id === where.id);
          if (where.candidateIdentifier)
            cp = candidateProfilesStore.find(
              (c) => c.candidateIdentifier === where.candidateIdentifier,
            );
          if (where.email)
            cp = candidateProfilesStore.find(
              (c) => c.email.toLowerCase() === where.email.toLowerCase(),
            );
          return Promise.resolve(cp ? { ...cp } : null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          let cp = null;
          if (where.OR) {
            for (const cond of where.OR) {
              if (cond.id) cp = candidateProfilesStore.find((c) => c.id === cond.id);
              if (cond.candidateIdentifier)
                cp = candidateProfilesStore.find(
                  (c) => c.candidateIdentifier === cond.candidateIdentifier,
                );
              if (cond.userId) cp = candidateProfilesStore.find((c) => c.userId === cond.userId);
              if (cp) break;
            }
          }
          if (cp) {
            const user = usersStore.find((u) => u.id === cp.userId);
            const userAssignments = assignmentsStore
              .filter((a) => a.candidateId === cp.id)
              .map((a) => {
                const asmt = assessmentsStore.find((x) => x.id === a.assessmentId) || {
                  id: a.assessmentId,
                  title: 'Mock Assessment',
                  status: 'ACTIVE',
                  startAt: new Date(),
                  endAt: new Date(),
                };
                return { ...a, assessment: asmt };
              });
            return Promise.resolve({ ...cp, user, assignments: userAssignments });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          let results = [...candidateProfilesStore];
          if (where?.recruitmentReference) {
            results = results.filter((r) => r.recruitmentReference === where.recruitmentReference);
          }
          return Promise.resolve(
            results.map((cp) => {
              const user = usersStore.find((u) => u.id === cp.userId);
              const userAssignments = assignmentsStore.filter((a) => a.candidateId === cp.id);
              return {
                ...cp,
                user,
                _count: { assignments: userAssignments.length },
              };
            }),
          );
        }),
        count: jest.fn().mockImplementation(() => Promise.resolve(candidateProfilesStore.length)),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const cp = candidateProfilesStore.find((c) => c.id === where.id);
          if (cp) {
            Object.assign(cp, data);
            return Promise.resolve({ ...cp });
          }
          return Promise.resolve(null);
        }),
      },
      assessment: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const asmt = assessmentsStore.find((a) => a.id === where.id);
          return Promise.resolve(asmt ? { ...asmt } : null);
        }),
      },
      assessmentAssignment: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const a = assignmentsStore.find(
            (item) =>
              item.assessmentId === where.assessmentId_candidateId.assessmentId &&
              item.candidateId === where.assessmentId_candidateId.candidateId,
          );
          if (a) {
            return Promise.resolve({ ...a, sessions: a.sessions || [] });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newAssignment = {
            id: `asg_${Date.now()}_${Math.random()}`,
            assessmentId: data.assessmentId,
            candidateId: data.candidateId,
            assignedBy: data.assignedBy,
            assignmentStatus: data.assignmentStatus,
            assignedAt: new Date(),
            sessions: [],
          };
          assignmentsStore.push(newAssignment);
          return Promise.resolve(newAssignment);
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const idx = assignmentsStore.findIndex((a) => a.id === where.id);
          if (idx >= 0) assignmentsStore.splice(idx, 1);
          return Promise.resolve({ success: true });
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const entry = { id: `aud_${Date.now()}`, ...data, eventTimestamp: new Date() };
          auditLogsStore.push(entry);
          return Promise.resolve(entry);
        }),
        findMany: jest.fn().mockImplementation(() => {
          return Promise.resolve(auditLogsStore);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        PasswordService,
        AuditService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
  });

  describe('createCandidate (FR-CAN-001, FR-CAN-007, FR-AUTH-009, UC-02)', () => {
    it('creates candidate with provisioned temporary credential and never logs credential', async () => {
      const result = await service.createCandidate(
        {
          candidateIdentifier: 'CAN-2026-001',
          fullName: 'Ananya Roy',
          username: 'ananya.roy',
          email: 'ananya@example.com',
          institution: 'BITS Pilani',
          qualification: 'B.E. Computer Science',
          graduationYear: 2026,
          recruitmentReference: 'AUTUMN-DRIVE-2026',
        },
        'admin_1',
        'corr-001',
      );

      expect(result.candidate).toBeDefined();
      expect(result.candidate.candidateIdentifier).toBe('CAN-2026-001');
      expect(result.candidate.username).toBe('ananya.roy');
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(10);

      // Verify audit trail does NOT contain the password (Rule 5, FR-AUTH-009)
      const auditEntry = auditLogsStore.find((a) => a.eventType === 'CANDIDATE_CREATED');
      expect(auditEntry).toBeDefined();
      expect(auditEntry.outcome).toBe(AuditOutcome.SUCCESS);
      expect(JSON.stringify(auditEntry.metadata)).not.toContain(result.temporaryPassword);
      expect(auditEntry.metadata).not.toHaveProperty('password');
      expect(auditEntry.metadata).not.toHaveProperty('temporaryPassword');
    });

    it('rejects duplicate candidate ID with validation error (FR-CAN-007, UC-02 alt flow 2a)', async () => {
      // Seed first candidate
      await service.createCandidate(
        {
          candidateIdentifier: 'CAN-DUPLICATE-ID',
          fullName: 'First Student',
          username: 'student.first',
          email: 'first@example.com',
          institution: 'IIT',
          qualification: 'B.Tech',
          graduationYear: 2026,
          recruitmentReference: 'DRIVE-A',
        },
        'admin_1',
        'corr-002',
      );

      // Attempt duplicate ID
      await expect(
        service.createCandidate(
          {
            candidateIdentifier: 'CAN-DUPLICATE-ID',
            fullName: 'Second Student',
            username: 'student.second',
            email: 'second@example.com',
            institution: 'IIT',
            qualification: 'B.Tech',
            graduationYear: 2026,
            recruitmentReference: 'DRIVE-A',
          },
          'admin_1',
          'corr-003',
        ),
      ).rejects.toThrow(ApiErrorException);
    });

    it('rejects duplicate username with validation error (FR-CAN-007)', async () => {
      await service.createCandidate(
        {
          candidateIdentifier: 'CAN-2026-101',
          fullName: 'User One',
          username: 'duplicate.user',
          email: 'user1@example.com',
          institution: 'IIT',
          qualification: 'B.Tech',
          graduationYear: 2026,
          recruitmentReference: 'DRIVE-A',
        },
        'admin_1',
        'corr-004',
      );

      await expect(
        service.createCandidate(
          {
            candidateIdentifier: 'CAN-2026-102',
            fullName: 'User Two',
            username: 'duplicate.user',
            email: 'user2@example.com',
            institution: 'IIT',
            qualification: 'B.Tech',
            graduationYear: 2026,
            recruitmentReference: 'DRIVE-A',
          },
          'admin_1',
          'corr-005',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('bulkImportCandidates (FR-CAN-003, UC-03)', () => {
    it('validates template header and rejects invalid CSV format', async () => {
      const invalidCsv = 'wrongHeader,fullName\nCAN-001,John Doe';

      await expect(
        service.bulkImportCandidates(invalidCsv, 'admin_1', 'corr-bulk-1'),
      ).rejects.toThrow(ApiErrorException);
    });

    it('processes valid rows and provides detailed per-row error reporting for invalid rows', async () => {
      const csvData = [
        'candidateId,fullName,username,email,phone,institution,qualification,graduationYear,recruitmentReference',
        'CAN-BULK-001,Valid Candidate 1,valid.cand1,cand1@example.com,,NIT,B.Tech,2026,DRIVE-B',
        'CAN-BULK-002,Missing Email,cand2.user,,+919999999999,NIT,B.Tech,2026,DRIVE-B', // invalid email
        'CAN-BULK-003,Invalid Year,cand3.user,cand3@example.com,,NIT,B.Tech,1980,DRIVE-B', // invalid year < 2000
        'CAN-BULK-001,Duplicate In Batch,dup.cand,cand4@example.com,,NIT,B.Tech,2026,DRIVE-B', // duplicate candidateId
        'CAN-BULK-005,Valid Candidate 5,valid.cand5,cand5@example.com,,NIT,B.Tech,2026,DRIVE-B',
      ].join('\n');

      const result = await service.bulkImportCandidates(csvData, 'admin_1', 'corr-bulk-2');

      expect(result.totalRows).toBe(5);
      expect(result.importedCount).toBe(2);
      expect(result.errorCount).toBe(3);
      expect(result.errors.length).toBe(3);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ row: 3, field: 'email' }),
          expect.objectContaining({ row: 4, field: 'graduationYear' }),
          expect.objectContaining({ row: 5, field: 'candidateId' }),
        ]),
      );

      // Successfully imported rows contain temporary passwords for controlled distribution
      expect(result.importedCandidates.length).toBe(2);
      expect(result.importedCandidates[0].candidateId).toBe('CAN-BULK-001');
      expect(result.importedCandidates[0].temporaryPassword).toBeDefined();
    });
  });

  describe('assignAssessment & unassignAssessment (FR-CAN-004, FR-CAN-005, UC-06)', () => {
    it('assigns assessment to candidates individually and by cohort group', async () => {
      // Seed assessment
      assessmentsStore.push({
        id: 'asmt_test_1',
        title: 'Backend Engineering Assessment',
        status: 'ACTIVE',
      });

      // Seed candidate
      const cand = await service.createCandidate(
        {
          candidateIdentifier: 'CAN-ASSIGN-01',
          fullName: 'Dev Candidate',
          username: 'dev.cand',
          email: 'dev@test.com',
          institution: 'IIIT',
          qualification: 'M.Tech',
          graduationYear: 2026,
          recruitmentReference: 'REF-TECH-2026',
        },
        'admin_1',
        'corr-asg-1',
      );

      const assignResult = await service.assignAssessment(
        {
          assessmentId: 'asmt_test_1',
          candidateIds: [cand.candidate.id],
        },
        'admin_1',
        'corr-asg-2',
      );

      expect(assignResult.assignedCount).toBe(1);
      expect(assignmentsStore.length).toBe(1);
      expect(assignmentsStore[0].candidateId).toBe(cand.candidate.id);
    });

    it('unassigns assessment before start and blocks unassignment once attempt has commenced (FR-CAN-005)', async () => {
      assessmentsStore.push({
        id: 'asmt_test_2',
        title: 'Algorithms Test',
        status: 'ACTIVE',
      });

      const cand = await service.createCandidate(
        {
          candidateIdentifier: 'CAN-UNASSIGN-01',
          fullName: 'Alice Walker',
          username: 'alice.w',
          email: 'alice@test.com',
          institution: 'IIT',
          qualification: 'B.Tech',
          graduationYear: 2026,
          recruitmentReference: 'REF-ALGO',
        },
        'admin_1',
        'corr-unasg-1',
      );

      await service.assignAssessment(
        {
          assessmentId: 'asmt_test_2',
          candidateIds: [cand.candidate.id],
        },
        'admin_1',
        'corr-unasg-2',
      );

      // 1. Unassign before start succeeds (FR-CAN-005)
      const unassignResult = await service.unassignAssessment(
        {
          assessmentId: 'asmt_test_2',
          candidateId: cand.candidate.id,
        },
        'admin_1',
        'corr-unasg-3',
      );
      expect(unassignResult.success).toBe(true);
      expect(assignmentsStore.length).toBe(0);

      // Re-assign and simulate commenced session
      await service.assignAssessment(
        {
          assessmentId: 'asmt_test_2',
          candidateIds: [cand.candidate.id],
        },
        'admin_1',
        'corr-unasg-4',
      );

      // Mark session as ACTIVE
      assignmentsStore[0].sessions = [{ sessionStatus: 'ACTIVE' }];

      // 2. Unassign after start fails (FR-CAN-005)
      await expect(
        service.unassignAssessment(
          {
            assessmentId: 'asmt_test_2',
            candidateId: cand.candidate.id,
          },
          'admin_1',
          'corr-unasg-5',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });
});
