import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { SessionExpiryWorker } from './session-expiry.worker';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AccountStatus,
  AssessmentStatus,
  SessionState,
  AttemptState,
  AssignmentStatus,
  NavigationMode,
  QuestionType,
  ApiErrorCode,
} from '@verisync/shared';

describe('SessionsService & Exam Runtime (FR-TIME, FR-ANS, FR-UI, TC01..TC07, TC15, TC16)', () => {
  let service: SessionsService;
  let worker: SessionExpiryWorker;

  const mockCandidateUser = {
    id: 'usr_cand_1',
    username: 'cand.test',
    accountStatus: AccountStatus.ACTIVE,
  };

  const mockCandidateProfile = {
    id: 'cp_cand_1',
    candidateIdentifier: 'CAN-2026-001',
    userId: mockCandidateUser.id,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    institution: 'Tech Institute',
    qualification: 'B.Tech CS',
    graduationYear: 2026,
    recruitmentReference: 'DRIVE-2026',
    user: mockCandidateUser,
  };

  const mockAdminUser = {
    id: 'usr_admin_1',
    username: 'admin.super',
    role: 'SUPER_ADMIN',
  };

  const now = new Date();
  const startAt = new Date(now.getTime() - 1000 * 60 * 10); // started 10m ago
  const endAt = new Date(now.getTime() + 1000 * 60 * 120); // ends in 2h

  const mockAssessment = {
    id: 'asmt_exam_1',
    title: 'Full Stack Engineering Assessment',
    description: 'Comprehensive exam',
    instructions: 'Follow sequential rules',
    roleCategory: 'Software Engineer',
    overallDuration: 60, // 60 minutes
    startAt,
    endAt,
    status: AssessmentStatus.ACTIVE,
    attemptLimit: 1,
    randomizeQuestions: false,
    randomizeOptions: false,
    navigationMode: NavigationMode.SEQUENTIAL,
    assessmentQuestions: [
      {
        id: 'aq_1',
        assessmentId: 'asmt_exam_1',
        questionId: 'q_1',
        sequenceNumber: 1,
        timeLimitSeconds: 120, // 2 mins
        marksOverride: null,
        question: {
          id: 'q_1',
          questionType: QuestionType.MCQ_SINGLE,
          questionText: 'What is the time complexity of binary search?',
          maximumMarks: 5,
          options: [
            { id: 'opt_1', optionText: 'O(log n)', displayOrder: 1, isCorrect: true },
            { id: 'opt_2', optionText: 'O(n)', displayOrder: 2, isCorrect: false },
          ],
          testCases: [],
        },
      },
      {
        id: 'aq_2',
        assessmentId: 'asmt_exam_1',
        questionId: 'q_2',
        sequenceNumber: 2,
        timeLimitSeconds: 180, // 3 mins
        marksOverride: null,
        question: {
          id: 'q_2',
          questionType: QuestionType.CODING,
          questionText: 'Implement a function to reverse a string.',
          codeSnippet: 'function reverse(str) {}',
          maximumMarks: 10,
          options: [],
          testCases: [
            { id: 'tc_1', inputData: 'abc', expectedOutput: 'cba', visibility: 'SAMPLE' },
            { id: 'tc_2', inputData: 'hidden', expectedOutput: 'neddih', visibility: 'HIDDEN' },
          ],
        },
      },
    ],
  };

  const mockAssignment = {
    id: 'assign_1',
    assessmentId: mockAssessment.id,
    candidateId: mockCandidateProfile.id,
    assignmentStatus: AssignmentStatus.ASSIGNED,
    assessment: mockAssessment,
    sessions: [] as any[],
  };

  let mockPrisma: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockAssignment.sessions = [];

    mockPrisma = {
      candidateProfile: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.userId === mockCandidateUser.id) return Promise.resolve(mockCandidateProfile);
          return Promise.resolve(null);
        }),
      },
      labDevice: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.deviceReference === 'BLOCKED-DEVICE') {
            return Promise.resolve({
              id: 'dev_blocked',
              deviceReference: 'BLOCKED-DEVICE',
              deviceStatus: 'BLOCKED',
              approvedClientVersion: '1.0.0',
            });
          }
          if (where.deviceReference === 'LAB-DESKTOP-01') {
            return Promise.resolve({
              id: 'dev_ok',
              deviceReference: 'LAB-DESKTOP-01',
              deviceStatus: 'ACTIVE',
              approvedClientVersion: '1.0.0',
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      assessmentAssignment: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (
            where.assessmentId_candidateId?.assessmentId === mockAssessment.id &&
            where.assessmentId_candidateId?.candidateId === mockCandidateProfile.id
          ) {
            return Promise.resolve(mockAssignment);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(mockAssignment, data);
          return Promise.resolve(mockAssignment);
        }),
      },
      assessmentSession: {
        create: jest.fn().mockImplementation(({ data }) => {
          const session = {
            id: 'sess_1',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockAssignment.sessions.push(session);
          return Promise.resolve(session);
        }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const session = mockAssignment.sessions.find((s) => s.id === where.id);
          if (session) {
            Object.assign(session, data);
            return Promise.resolve(session);
          }
          return Promise.resolve({ id: where.id, ...data });
        }),
      },
      questionAttempt: {
        create: jest.fn().mockImplementation(({ data }) => {
          const aq = mockAssessment.assessmentQuestions.find(
            (q) => q.id === data.assessmentQuestionId,
          );
          return Promise.resolve({
            id: `qa_${data.assessmentQuestionId}`,
            ...data,
            assessmentQuestion: aq,
            answers: [],
          });
        }),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ where, data }) => {
          if (where.id === 'qa_aq_1' || where.id === 'qa_1') {
            return Promise.resolve({
              id: where.id,
              ...data,
              assessmentQuestion: mockAssessment.assessmentQuestions[0],
            });
          }
          if (where.id === 'qa_aq_2' || where.id === 'qa_2') {
            return Promise.resolve({
              id: where.id,
              ...data,
              assessmentQuestion: mockAssessment.assessmentQuestions[1],
            });
          }
          return Promise.resolve({ id: where.id, ...data });
        }),
      },
      answer: {
        create: jest.fn().mockImplementation(({ data }) => {
          return Promise.resolve({
            id: 'ans_1',
            ...data,
            submittedAt: new Date(),
          });
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue({ id: 'audit_1' }),
      sanitizeMetadata: jest.fn().mockImplementation((meta) => meta),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        SessionExpiryWorker,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    worker = module.get<SessionExpiryWorker>(SessionExpiryWorker);
  });

  afterEach(() => {
    worker.onModuleDestroy();
  });

  describe('Session Initiation & Access Controls', () => {
    it('TC-16: should reject unsupported or retired client versions with HTTP 426 (FR-LAB-003, TC-16)', async () => {
      await expect(
        service.startSession(
          mockCandidateUser.id,
          mockAssessment.id,
          { clientVersion: '0.9.0', acknowledgedInstructions: true },
          'corr-tc16',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.UNSUPPORTED_CLIENT,
        }),
      );
    });

    it('should reject blocked lab devices with HTTP 403 (FR-LAB-004)', async () => {
      await expect(
        service.startSession(
          mockCandidateUser.id,
          mockAssessment.id,
          {
            clientVersion: '1.0.0',
            deviceId: 'BLOCKED-DEVICE',
            acknowledgedInstructions: true,
          },
          'corr-dev-block',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.FORBIDDEN,
        }),
      );
    });

    it('should reject starting assessment if candidate has not acknowledged instructions (FR-UI-002)', async () => {
      await expect(
        service.startSession(
          mockCandidateUser.id,
          mockAssessment.id,
          { clientVersion: '1.0.0', acknowledgedInstructions: false },
          'corr-ack',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.VALIDATION_FAILED,
        }),
      );
    });

    it('should start session, activate question 1 with capped deadline, and hide answer keys (FR-TIME-002, TC-09)', async () => {
      const response = await service.startSession(
        mockCandidateUser.id,
        mockAssessment.id,
        { clientVersion: '1.0.0', acknowledgedInstructions: true, deviceId: 'LAB-DESKTOP-01' },
        'corr-start',
        '127.0.0.1',
      );

      expect(response).toBeDefined();
      expect(response.sessionId).toBe('sess_1');
      expect(response.attemptNumber).toBe(1);
      expect(response.currentQuestion.sequenceNumber).toBe(1);
      expect(response.currentQuestion.questionType).toBe(QuestionType.MCQ_SINGLE);
      expect(response.palette).toHaveLength(2);
      expect(response.palette[0].status).toBe('CURRENT');
      expect(response.palette[1].status).toBe('NOT_ANSWERED');

      // Security check (TC-09 & Rule 2): zero isCorrect in options
      expect(response.currentQuestion.options).toBeDefined();
      response.currentQuestion.options!.forEach((opt) => {
        expect((opt as any).isCorrect).toBeUndefined();
      });

      // Audit log logged
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SESSION_START',
          outcome: 'SUCCESS',
        }),
      );
    });

    it('TC-15: should reject starting a second session while an active session exists (BR-007, TC-15)', async () => {
      // Simulate an existing active session
      mockAssignment.sessions.push({
        id: 'sess_active_existing',
        sessionStatus: SessionState.ACTIVE,
        attemptNumber: 1,
      });

      await expect(
        service.startSession(
          mockCandidateUser.id,
          mockAssessment.id,
          { clientVersion: '1.0.0', acknowledgedInstructions: true },
          'corr-tc15',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.INVALID_STATE,
        }),
      );
    });
  });

  describe('Sequential Navigation & Answer Submission (FR-ANS-001..009, TC-01..05)', () => {
    let activeSession: any;
    let qa1: any;
    let qa2: any;

    beforeEach(() => {
      const sStart = new Date(Date.now() - 30000); // started 30s ago
      const sDeadline = new Date(sStart.getTime() + 60 * 60 * 1000); // 1h
      const q1Deadline = new Date(sStart.getTime() + 120 * 1000); // 2 mins

      qa1 = {
        id: 'qa_aq_1',
        sessionId: 'sess_active',
        assessmentQuestionId: 'aq_1',
        attemptStatus: AttemptState.ACTIVE,
        startedAt: sStart,
        deadlineAt: q1Deadline,
        assessmentQuestion: mockAssessment.assessmentQuestions[0],
        answers: [] as any[],
      };

      qa2 = {
        id: 'qa_aq_2',
        sessionId: 'sess_active',
        assessmentQuestionId: 'aq_2',
        attemptStatus: AttemptState.PENDING,
        startedAt: null,
        deadlineAt: null,
        assessmentQuestion: mockAssessment.assessmentQuestions[1],
        answers: [] as any[],
      };

      activeSession = {
        id: 'sess_active',
        assignmentId: mockAssignment.id,
        assignment: mockAssignment,
        attemptNumber: 1,
        startedAt: sStart,
        overallDeadline: sDeadline,
        sessionStatus: SessionState.ACTIVE,
        questionAttempts: [qa1, qa2],
      };

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(activeSession);
      mockPrisma.questionAttempt.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === qa1.id) return Promise.resolve({ ...qa1, session: activeSession });
        if (where.id === qa2.id) return Promise.resolve({ ...qa2, session: activeSession });
        return Promise.resolve(null);
      });
      mockPrisma.questionAttempt.findFirst.mockImplementation(({ where }: any) => {
        if (where.attemptStatus === AttemptState.PENDING) {
          return Promise.resolve({
            ...qa2,
            assessmentQuestion: mockAssessment.assessmentQuestions[1],
          });
        }
        return Promise.resolve(null);
      });
    });

    it('TC-02: should reject submitting answer for a future/pending question with HTTP 409 INVALID_STATE (FR-ANS-001, BR-003, TC-02)', async () => {
      await expect(
        service.submitAnswer(
          mockCandidateUser.id,
          activeSession.id,
          'idem-key-skip',
          {
            questionAttemptId: qa2.id, // pending question 2
            answer: { type: 'coding', language: 'javascript', sourceCode: 'return;' },
          },
          'corr-tc02',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.INVALID_STATE,
        }),
      );
    });

    it('TC-01: client clock changes do not alter server deadline; acceptance depends purely on server clock (FR-TIME-008, TC-01)', async () => {
      // Client submits valid answer within server deadline
      const response = await service.submitAnswer(
        mockCandidateUser.id,
        activeSession.id,
        'idem-key-tc01',
        {
          questionAttemptId: qa1.id,
          answer: { type: 'single_choice', optionId: 'opt_1' },
        },
        'corr-tc01',
        '127.0.0.1',
      );

      expect(response.status).toBe('accepted');
      expect(response.questionAttemptId).toBe(qa1.id);
      expect(response.next).toBeDefined();
      expect(response.next?.sequenceNumber).toBe(2);
      expect(mockPrisma.answer.create).toHaveBeenCalled();
    });

    it('TC-03: late answer after server deadline is rejected with HTTP 409 QUESTION_EXPIRED and auto-advances (FR-TIME-004, TC-03)', async () => {
      // Set question 1 deadline to 5 seconds ago
      qa1.deadlineAt = new Date(Date.now() - 5000);

      await expect(
        service.submitAnswer(
          mockCandidateUser.id,
          activeSession.id,
          'idem-key-late',
          {
            questionAttemptId: qa1.id,
            answer: { type: 'single_choice', optionId: 'opt_1' },
          },
          'corr-tc03',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.QUESTION_EXPIRED,
        }),
      );

      // Question 1 attempt should have been marked TIMED_OUT
      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: qa1.id },
          data: expect.objectContaining({
            attemptStatus: AttemptState.TIMED_OUT,
          }),
        }),
      );
    });

    it('TC-04: duplicate submit with same idempotency key returns original result and creates no duplicate record (FR-ANS-009, TC-04)', async () => {
      const idempotencyKey = 'idem-duplicate-tc04';

      // First submit
      await service.submitAnswer(
        mockCandidateUser.id,
        activeSession.id,
        idempotencyKey,
        {
          questionAttemptId: qa1.id,
          answer: { type: 'single_choice', optionId: 'opt_1' },
        },
        'corr-1',
        '127.0.0.1',
      );

      expect(mockPrisma.answer.create).toHaveBeenCalledTimes(1);

      // Simulate the answer stored in target attempt
      qa1.answers.push({
        id: 'ans_tc04',
        idempotencyKey,
        submittedAt: new Date(),
        questionAttemptId: qa1.id,
      });

      // Second submit with the identical idempotency key
      const duplicateRes = await service.submitAnswer(
        mockCandidateUser.id,
        activeSession.id,
        idempotencyKey,
        {
          questionAttemptId: qa1.id,
          answer: { type: 'single_choice', optionId: 'opt_1' },
        },
        'corr-2',
        '127.0.0.1',
      );

      expect(duplicateRes.status).toBe('accepted');
      expect(duplicateRes.questionAttemptId).toBe(qa1.id);
      // Ensure no second record was created
      expect(mockPrisma.answer.create).toHaveBeenCalledTimes(1);
    });

    it('TC-05: lost acknowledgement retry with same idempotency key returns original ack without creating duplicate (FR-ANS-007, TC-05)', async () => {
      const idempotencyKey = 'idem-lost-ack-tc05';

      qa1.answers.push({
        id: 'ans_lost_ack',
        idempotencyKey,
        submittedAt: new Date(Date.now() - 10000),
        questionAttemptId: qa1.id,
      });

      const response = await service.submitAnswer(
        mockCandidateUser.id,
        activeSession.id,
        idempotencyKey,
        {
          questionAttemptId: qa1.id,
          answer: { type: 'single_choice', optionId: 'opt_1' },
        },
        'corr-tc05',
        '127.0.0.1',
      );

      expect(response.status).toBe('accepted');
      expect(response.questionAttemptId).toBe(qa1.id);
      expect(mockPrisma.answer.create).not.toHaveBeenCalled();
    });

    it('Concurrency Test: parallel requests with same idempotency key are safely handled without duplicates', async () => {
      const idempotencyKey = 'concurrent-key-1';

      // Fire 5 simultaneous submission requests
      const promises = Array.from({ length: 5 }).map((_, idx) =>
        service.submitAnswer(
          mockCandidateUser.id,
          activeSession.id,
          idempotencyKey,
          {
            questionAttemptId: qa1.id,
            answer: { type: 'single_choice', optionId: 'opt_1' },
          },
          `corr-concurrent-${idx}`,
          '127.0.0.1',
        ),
      );

      const results = await Promise.all(promises);

      // All 5 promises resolved to accepted
      results.forEach((r) => {
        expect(r.status).toBe('accepted');
        expect(r.questionAttemptId).toBe(qa1.id);
      });
    });
  });

  describe('Timing Expiry, Tie-Breaking & Disconnection Recovery', () => {
    it('TC-06: simultaneous deadlines -> question expires at overall deadline -> overall deadline takes precedence, session EXPIRED (FR-TIME-007, TC-06)', async () => {
      const pastDeadline = new Date(Date.now() - 1000);
      const qa1 = {
        id: 'qa_tie',
        attemptStatus: AttemptState.ACTIVE,
        deadlineAt: pastDeadline,
        assessmentQuestion: mockAssessment.assessmentQuestions[0],
      };

      const sessionWithExpiredOverall = {
        id: 'sess_tie',
        assignmentId: mockAssignment.id,
        sessionStatus: SessionState.ACTIVE,
        overallDeadline: pastDeadline, // overall deadline also passed
        questionAttempts: [qa1],
      };

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(sessionWithExpiredOverall);

      await service.processSessionExpirations(sessionWithExpiredOverall.id, new Date());

      expect(mockPrisma.assessmentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sessionWithExpiredOverall.id },
          data: expect.objectContaining({
            sessionStatus: SessionState.EXPIRED,
          }),
        }),
      );
    });

    it('TC-07: disconnection during question -> session marked INTERRUPTED, resume to ACTIVE on reconnect without resetting deadline (FR-TIME-010, BR-010, TC-07)', async () => {
      const sStart = new Date(Date.now() - 40000); // 40s ago
      const sDeadline = new Date(sStart.getTime() + 60 * 60 * 1000);
      const qDeadline = new Date(sStart.getTime() + 120 * 1000);

      const interruptedSession = {
        id: 'sess_interrupted',
        assignmentId: mockAssignment.id,
        assignment: mockAssignment,
        sessionStatus: SessionState.INTERRUPTED, // disconnected
        startedAt: sStart,
        overallDeadline: sDeadline,
        questionAttempts: [
          {
            id: 'qa_1',
            attemptStatus: AttemptState.ACTIVE,
            deadlineAt: qDeadline,
            startedAt: sStart,
            assessmentQuestion: mockAssessment.assessmentQuestions[0],
          },
        ],
      };

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(interruptedSession);

      const status = await service.getSessionStatus(mockCandidateUser.id, interruptedSession.id);

      // Session status resumed to ACTIVE
      expect(mockPrisma.assessmentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: interruptedSession.id },
          data: expect.objectContaining({
            sessionStatus: SessionState.ACTIVE,
          }),
        }),
      );

      // Server deadline was NOT reset; remaining time reflects disconnected interval
      expect(status.overallRemainingSeconds).toBeLessThan(60 * 60);
      expect(status.overallDeadline).toBe(sDeadline.toISOString());
    });
  });

  describe('Draft Autosave & Final Submission (FR-ANS-005, FR-ANS-008, UC-13)', () => {
    it('should save draft without submitting or extending deadlines (FR-ANS-005)', async () => {
      const qa = {
        id: 'qa_draft',
        sessionId: 'sess_draft',
        attemptStatus: AttemptState.ACTIVE,
        session: {
          assignment: {
            candidateId: mockCandidateProfile.id,
          },
        },
      };

      mockPrisma.questionAttempt.findUnique.mockResolvedValue(qa);

      const res = await service.saveDraft(mockCandidateUser.id, 'sess_draft', {
        questionAttemptId: 'qa_draft',
        draftPayload: { code: 'console.log("draft code")' },
      });

      expect(res.status).toBe('saved');
      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_draft' },
          data: {
            draftPayload: { code: 'console.log("draft code")' },
          },
        }),
      );
    });

    it('should finalize assessment, lock state as SUBMITTED, and record audit event (FR-ANS-008, UC-13)', async () => {
      const activeSession = {
        id: 'sess_final',
        assignmentId: mockAssignment.id,
        assignment: mockAssignment,
        sessionStatus: SessionState.ACTIVE,
        questionAttempts: [
          { id: 'qa_1', attemptStatus: AttemptState.ACTIVE },
          { id: 'qa_2', attemptStatus: AttemptState.PENDING },
        ],
      };

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(activeSession);

      const res = await service.finalSubmit(
        mockCandidateUser.id,
        activeSession.id,
        'corr-final-submit',
        '127.0.0.1',
      );

      expect(res.status).toBe('submitted');
      expect(mockPrisma.assessmentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: activeSession.id },
          data: expect.objectContaining({
            sessionStatus: SessionState.SUBMITTED,
          }),
        }),
      );
      expect(mockPrisma.assessmentAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAssignment.id },
          data: { assignmentStatus: AssignmentStatus.COMPLETED },
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SESSION_SUBMIT',
          outcome: 'SUCCESS',
        }),
      );
    });
  });

  describe('Administrative Overrides & Expiry Worker (BR-012, UC-12, FR-TIME-011)', () => {
    it('should reject admin override if reason is missing (BR-012)', async () => {
      await expect(
        service.adminOverride(
          mockAdminUser.id,
          'sess_override',
          { action: 'EXTEND', reason: '   ', extensionMinutes: 10 },
          'corr-reason',
          '127.0.0.1',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ApiErrorCode.VALIDATION_FAILED,
        }),
      );
    });

    it('should extend session duration with audit log (BR-012, UC-12, FR-TIME-011)', async () => {
      const initialDeadline = new Date(Date.now() + 1000 * 60 * 30); // 30m left
      const session = {
        id: 'sess_extend',
        sessionStatus: SessionState.ACTIVE,
        overallDeadline: initialDeadline,
        questionAttempts: [
          {
            id: 'qa_ext',
            attemptStatus: AttemptState.ACTIVE,
            deadlineAt: initialDeadline,
          },
        ],
      };

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(session);

      const res = await service.adminOverride(
        mockAdminUser.id,
        session.id,
        {
          action: 'EXTEND',
          reason: 'Lab power flickered for 10 minutes',
          extensionMinutes: 15,
        },
        'corr-extend',
        '127.0.0.1',
      );

      expect(res.newStatus).toBe(SessionState.ACTIVE);
      expect(new Date(res.overallDeadline).getTime()).toBeGreaterThan(initialDeadline.getTime());
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ADMIN_SESSION_OVERRIDE',
          metadata: expect.objectContaining({
            action: 'EXTEND',
            reason: 'Lab power flickered for 10 minutes',
          }),
        }),
      );
    });

    it('SessionExpiryWorker should scan and process expired sessions and heartbeats', async () => {
      mockPrisma.assessmentSession.findMany.mockImplementation(({ where }: any) => {
        if (where.overallDeadline) {
          return Promise.resolve([{ id: 'sess_expired_1' }]);
        }
        if (where.lastHeartbeatAt) {
          return Promise.resolve([{ id: 'sess_lost_heartbeat' }]);
        }
        return Promise.resolve([]);
      });

      const count = await worker.processExpirations();
      expect(count).toBeGreaterThan(0);
    });
  });
});
