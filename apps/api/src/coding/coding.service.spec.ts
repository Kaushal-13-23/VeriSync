import { Test, TestingModule } from '@nestjs/testing';
import { CodingService } from './coding.service';
import { CodeRunnerClient } from './code-runner.client';
import { SqlSandboxService } from '../sql/sql-sandbox.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AttemptState,
  ExecutionStatus,
  QuestionType,
  SessionState,
  SubmissionStatus,
} from '@verisync/shared';
import { ApiErrorException } from '../common/api-error.exception';
import { Decimal } from '@prisma/client/runtime/library';

describe('CodingService (FR-CODE-001..014, TC-10, TC-12)', () => {
  let service: CodingService;
  let codeRunnerClient: CodeRunnerClient;

  // Mock repositories
  const mockCandidate = {
    id: 'can-101',
    userId: 'user-cand-101',
    fullName: 'Jane Doe',
  };

  const mockSession = {
    id: 'session-201',
    assignmentId: 'asmt-assign-301',
    sessionStatus: SessionState.ACTIVE,
    assignment: {
      candidateId: 'can-101',
      assessment: {
        id: 'asmt-401',
        title: 'Software Engineer Assessment',
      },
    },
  };

  const mockCodingQuestionAttempt = {
    id: 'qa-501',
    sessionId: 'session-201',
    attemptStatus: AttemptState.ACTIVE,
    deadlineAt: new Date(Date.now() + 600000), // 10 minutes remaining
    awardedMarks: null,
    assessmentQuestion: {
      maxSubmissions: 3,
      timeLimitSeconds: 2,
      marksOverride: new Decimal(10.0),
      question: {
        id: 'q-601',
        questionType: QuestionType.CODING,
        maximumMarks: new Decimal(10.0),
        maxSubmissions: 3,
        testCases: [
          {
            id: 'tc-sample-1',
            inputData: '5',
            expectedOutput: '25',
            visibility: 'SAMPLE',
            marks: new Decimal(4.0),
          },
          {
            id: 'tc-hidden-2',
            inputData: '10',
            expectedOutput: '100',
            visibility: 'HIDDEN',
            marks: new Decimal(6.0),
          },
        ],
      },
    },
  };

  const mockSqlQuestionAttempt = {
    id: 'qa-502',
    sessionId: 'session-201',
    attemptStatus: AttemptState.ACTIVE,
    deadlineAt: new Date(Date.now() + 600000),
    awardedMarks: null,
    assessmentQuestion: {
      maxSubmissions: 5,
      timeLimitSeconds: 3,
      marksOverride: new Decimal(15.0),
      question: {
        id: 'q-602',
        questionType: QuestionType.SQL,
        maximumMarks: new Decimal(15.0),
        schemaDefinition: 'CREATE TABLE t (x INT); INSERT INTO t VALUES (1), (2);',
        referenceSolution: 'SELECT * FROM t WHERE x = 2;',
        testCases: [],
      },
    },
  };

  let submissionsStore: any[] = [];

  const mockPrismaService = {
    candidateProfile: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.userId === mockCandidate.userId) return Promise.resolve(mockCandidate);
        return Promise.resolve(null);
      }),
    },
    assessmentSession: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockSession.id) return Promise.resolve(mockSession);
        return Promise.resolve(null);
      }),
    },
    questionAttempt: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'qa-501') return Promise.resolve(mockCodingQuestionAttempt);
        if (where.id === 'qa-502') return Promise.resolve(mockSqlQuestionAttempt);
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        return Promise.resolve({ id: where.id, ...data });
      }),
    },
    codingSubmission: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) {
          const found = submissionsStore.find((s) => s.id === where.id);
          if (found) {
            const qa =
              found.questionAttemptId === 'qa-502'
                ? mockSqlQuestionAttempt
                : mockCodingQuestionAttempt;
            return Promise.resolve({
              ...found,
              questionAttempt: {
                ...qa,
                session: mockSession,
              },
            });
          }
        }
        if (where.questionAttemptId_idempotencyKey) {
          const found = submissionsStore.find(
            (s) =>
              s.questionAttemptId === where.questionAttemptId_idempotencyKey.questionAttemptId &&
              s.idempotencyKey === where.questionAttemptId_idempotencyKey.idempotencyKey,
          );
          return Promise.resolve(found || null);
        }
        return Promise.resolve(null);
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          submissionsStore.filter((s) => s.questionAttemptId === where.questionAttemptId).length,
        );
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const sub = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          ...data,
          submissionStatus: data.submissionStatus || SubmissionStatus.QUEUED,
          retryCount: data.retryCount ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        submissionsStore.push(sub);
        return Promise.resolve(sub);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const index = submissionsStore.findIndex((s) => s.id === where.id);
        if (index >= 0) {
          submissionsStore[index] = { ...submissionsStore[index], ...data, updatedAt: new Date() };
          return Promise.resolve(submissionsStore[index]);
        }
        return Promise.resolve({ id: where.id, ...data });
      }),
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    submissionsStore = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodingService,
        CodeRunnerClient,
        SqlSandboxService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CodingService>(CodingService);
    codeRunnerClient = module.get<CodeRunnerClient>(CodeRunnerClient);
    codeRunnerClient.setMockFailureMode('NONE');
  });

  describe('Submission Validation & Limits (FR-CODE-010, FR-ANS-009)', () => {
    it('should successfully enqueue code submission and return submission ID', async () => {
      const result = await service.submitCode(
        mockCandidate.userId,
        mockSession.id,
        'idem-key-1',
        {
          questionAttemptId: 'qa-501',
          language: 'python',
          sourceCode: 'def solve(x): return x * x',
        },
        'corr-001',
        '127.0.0.1',
      );

      expect(result.submissionId).toBeDefined();
      expect(result.questionAttemptId).toBe('qa-501');
      expect(result.status).toBe(SubmissionStatus.QUEUED);
      expect(submissionsStore.length).toBe(1);
    });

    it('should enforce idempotency: duplicate idempotency key returns original submission (FR-ANS-009, Rule 3)', async () => {
      const first = await service.submitCode(
        mockCandidate.userId,
        mockSession.id,
        'idem-key-duplicate-check',
        {
          questionAttemptId: 'qa-501',
          language: 'python',
          sourceCode: 'print(1)',
        },
        'corr-002',
        '127.0.0.1',
      );

      const second = await service.submitCode(
        mockCandidate.userId,
        mockSession.id,
        'idem-key-duplicate-check',
        {
          questionAttemptId: 'qa-501',
          language: 'python',
          sourceCode: 'print(1)',
        },
        'corr-002',
        '127.0.0.1',
      );

      expect(second.submissionId).toBe(first.submissionId);
      expect(submissionsStore.length).toBe(1);
    });

    it('should enforce per-question maximum submission limit (FR-CODE-010)', async () => {
      // Limit is 3 for qa-501
      await service.submitCode(
        mockCandidate.userId,
        mockSession.id,
        'idem-sub-1',
        { questionAttemptId: 'qa-501', language: 'python', sourceCode: 'p1' },
        'c1',
        '127.0.0.1',
      );
      await service.submitCode(
        mockCandidate.userId,
        mockSession.id,
        'idem-sub-2',
        { questionAttemptId: 'qa-501', language: 'python', sourceCode: 'p2' },
        'c2',
        '127.0.0.1',
      );
      await service.submitCode(
        mockCandidate.userId,
        mockSession.id,
        'idem-sub-3',
        { questionAttemptId: 'qa-501', language: 'python', sourceCode: 'p3' },
        'c3',
        '127.0.0.1',
      );

      // 4th submission must be rejected with 409 INVALID_STATE
      await expect(
        service.submitCode(
          mockCandidate.userId,
          mockSession.id,
          'idem-sub-4',
          { questionAttemptId: 'qa-501', language: 'python', sourceCode: 'p4' },
          'c4',
          '127.0.0.1',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('TC-10: Hidden Test Case Leak Prevention (FR-CODE-004, FR-CODE-009, Rule 2)', () => {
    it('should never expose hidden test cases, hidden inputs, or expected outputs in candidate status (TC-10)', async () => {
      const submission = await mockPrismaService.codingSubmission.create({
        data: {
          questionAttemptId: 'qa-501',
          language: 'python',
          sourceCode: 'def square(n): return n * n',
          submissionStatus: SubmissionStatus.COMPLETED,
        },
      });

      // Run evaluation
      await service.processSubmissionJob(submission.id, 'qa-501', 'corr-tc10');

      // Fetch candidate status
      const status = await service.getSubmissionStatus(
        mockCandidate.userId,
        mockSession.id,
        submission.id,
      );

      expect(status.submissionStatus).toBe(SubmissionStatus.COMPLETED);
      expect(status.executionStatus).toBe(ExecutionStatus.ACCEPTED);
      expect(status.sampleTestResults).toBeDefined();

      // Verify that sample test results contain ONLY sample test cases
      expect(status.sampleTestResults?.length).toBe(1);
      expect(status.sampleTestResults?.[0].testCaseId).toBe('tc-sample-1');
      expect(status.sampleTestResults?.[0].inputData).toBe('5');

      // Crucial security check: Hidden test case 'tc-hidden-2' with input '10' and output '100' must NOT appear
      const responseString = JSON.stringify(status);
      expect(responseString).not.toContain('tc-hidden-2');
      expect(responseString).not.toContain('"inputData":"10"');
      expect(responseString).not.toContain('"expectedOutput":"100"');
      expect((status as any).hiddenTestResults).toBeUndefined();
    });
  });

  describe('TC-12: Infrastructure Failure Resilience (FR-CODE-012)', () => {
    it('should flag infrastructure errors without penalizing candidate or deducting marks (TC-12)', async () => {
      // Simulate infrastructure outage in code-runner service
      codeRunnerClient.setMockFailureMode('SERVICE_UNAVAILABLE');

      const submission = await mockPrismaService.codingSubmission.create({
        data: {
          questionAttemptId: 'qa-501',
          language: 'python',
          sourceCode: 'print(42)',
          submissionStatus: SubmissionStatus.QUEUED,
          retryCount: 2, // At max retry limit to test terminal infrastructure error behavior
        },
      });

      // Run job
      await service.processSubmissionJob(submission.id, 'qa-501', 'corr-tc12');

      const updated = submissionsStore.find((s) => s.id === submission.id);
      expect(updated.isInfrastructureError).toBe(true);
      expect(updated.submissionStatus).toBe(SubmissionStatus.FAILED);
      expect(updated.executionStatus).toBe(ExecutionStatus.INTERNAL_EVALUATION_ERROR);

      // Verify candidate is NOT marked wrong answer and awardedMarks is not set to 0 as penalty
      expect(updated.executionStatus).not.toBe(ExecutionStatus.WRONG_ANSWER);
      expect(mockPrismaService.questionAttempt.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: { awardedMarks: new Decimal(0) },
        }),
      );
    });
  });

  describe('Weighted Test Case Scoring (FR-CODE-011)', () => {
    it('should calculate proportional marks from weighted test cases', async () => {
      // Question has tc-sample-1 (4 marks) and tc-hidden-2 (6 marks)
      const submission = await mockPrismaService.codingSubmission.create({
        data: {
          questionAttemptId: 'qa-501',
          language: 'python',
          sourceCode: 'SAMPLE_PASS_WRONG_ANSWER', // Sample passes (4 marks), hidden fails (0 marks)
          submissionStatus: SubmissionStatus.QUEUED,
        },
      });

      await service.processSubmissionJob(submission.id, 'qa-501', 'corr-weighted');

      const updated = submissionsStore.find((s) => s.id === submission.id);
      expect(updated.submissionStatus).toBe(SubmissionStatus.COMPLETED);
      // Sample test case passed (4 marks awarded out of 10)
      expect(Number(updated.awardedMarks)).toBe(4);
      expect(Number(updated.totalMarks)).toBe(10);
      expect(updated.executionStatus).toBe(ExecutionStatus.WRONG_ANSWER);
    });
  });

  describe('SQL Question Submission & Sandbox Evaluation (FR-SQL-001..005)', () => {
    it('should evaluate SQL submission against isolated database and award marks (FR-SQL-002, 005)', async () => {
      const submission = await mockPrismaService.codingSubmission.create({
        data: {
          questionAttemptId: 'qa-502',
          language: 'sql',
          sourceCode: 'SELECT * FROM t WHERE x = 2;',
          submissionStatus: SubmissionStatus.QUEUED,
        },
      });

      await service.processSubmissionJob(submission.id, 'qa-502', 'corr-sql');

      const updated = submissionsStore.find((s) => s.id === submission.id);
      expect(updated.submissionStatus).toBe(SubmissionStatus.COMPLETED);
      expect(updated.executionStatus).toBe(ExecutionStatus.ACCEPTED);
      expect(Number(updated.awardedMarks)).toBe(15);
    });
  });
});
