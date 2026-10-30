import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AttemptState, AuditOutcome, QuestionType, ResultStatus } from '@verisync/shared';
import { Decimal } from '@prisma/client/runtime/library';

describe('EvaluationService & Scoring Engine (FR-SCORE-001..010, BR-011, TC-13, TC-14)', () => {
  let service: EvaluationService;
  let mockPrisma: any;
  let mockAuditService: any;

  // Fixed test fixtures for config-version consistency and regression testing
  const frozenPublishedSnapshot = {
    publishedAt: '2026-10-25T10:00:00.000Z',
    configurationVersion: 1,
    assessmentConfig: {
      negativeMarking: true,
      negativeMarkValue: 1.0,
      passingMarks: 10.0,
    },
    questions: [
      {
        questionId: 'q_mcq_single',
        sequenceNumber: 1,
        questionType: QuestionType.MCQ_SINGLE,
        maximumMarks: 4,
        negativeMarks: 1,
        options: [
          { id: 'opt_1', optionText: 'Option A (Correct)', displayOrder: 1, isCorrect: true },
          { id: 'opt_2', optionText: 'Option B (Wrong)', displayOrder: 2, isCorrect: false },
        ],
      },
      {
        questionId: 'q_mcq_multi',
        sequenceNumber: 2,
        questionType: QuestionType.MCQ_MULTIPLE,
        maximumMarks: 6,
        negativeMarks: 1,
        options: [
          { id: 'opt_m1', optionText: 'Correct 1', displayOrder: 1, isCorrect: true },
          { id: 'opt_m2', optionText: 'Correct 2', displayOrder: 2, isCorrect: true },
          { id: 'opt_m3', optionText: 'Correct 3', displayOrder: 3, isCorrect: true },
          { id: 'opt_m4', optionText: 'Wrong', displayOrder: 4, isCorrect: false },
        ],
      },
      {
        questionId: 'q_true_false',
        sequenceNumber: 3,
        questionType: QuestionType.TRUE_FALSE,
        maximumMarks: 2,
        negativeMarks: 0.5,
        options: [
          { id: 'opt_tf_true', optionText: 'True', displayOrder: 1, isCorrect: true },
          { id: 'opt_tf_false', optionText: 'False', displayOrder: 2, isCorrect: false },
        ],
      },
      {
        questionId: 'q_subjective',
        sequenceNumber: 4,
        questionType: QuestionType.SHORT_ANSWER,
        maximumMarks: 5,
        negativeMarks: 0,
      },
    ],
  };

  const createMockSession = (overrides?: any) => ({
    id: 'session_test_1',
    assignmentId: 'assign_1',
    sessionStatus: 'SUBMITTED',
    submittedAt: new Date('2026-10-25T11:00:00.000Z'),
    assignment: {
      assessmentId: 'asmt_1',
      assessment: {
        id: 'asmt_1',
        title: 'Full Stack Engineering Evaluation',
        negativeMarking: true,
        negativeMarkValue: new Decimal(1.0),
        passingMarks: new Decimal(10.0),
        publishedSnapshot: frozenPublishedSnapshot,
        assessmentQuestions: [
          {
            id: 'aq_1',
            questionId: 'q_mcq_single',
            sequenceNumber: 1,
            marksOverride: null,
            question: {
              id: 'q_mcq_single',
              questionType: QuestionType.MCQ_SINGLE,
              maximumMarks: new Decimal(4),
              negativeMarks: new Decimal(1),
              options: frozenPublishedSnapshot.questions[0].options,
              testCases: [],
            },
          },
          {
            id: 'aq_2',
            questionId: 'q_mcq_multi',
            sequenceNumber: 2,
            marksOverride: null,
            question: {
              id: 'q_mcq_multi',
              questionType: QuestionType.MCQ_MULTIPLE,
              maximumMarks: new Decimal(6),
              negativeMarks: new Decimal(1),
              options: frozenPublishedSnapshot.questions[1].options,
              testCases: [],
            },
          },
          {
            id: 'aq_3',
            questionId: 'q_true_false',
            sequenceNumber: 3,
            marksOverride: null,
            question: {
              id: 'q_true_false',
              questionType: QuestionType.TRUE_FALSE,
              maximumMarks: new Decimal(2),
              negativeMarks: new Decimal(0.5),
              options: frozenPublishedSnapshot.questions[2].options,
              testCases: [],
            },
          },
          {
            id: 'aq_4',
            questionId: 'q_subjective',
            sequenceNumber: 4,
            marksOverride: null,
            question: {
              id: 'q_subjective',
              questionType: QuestionType.SHORT_ANSWER,
              maximumMarks: new Decimal(5),
              negativeMarks: new Decimal(0),
              options: [],
              testCases: [],
            },
          },
        ],
      },
      candidate: {
        id: 'cand_1',
        candidateIdentifier: 'CAN-2026-001',
        fullName: 'Kaushal Kumar Singh',
        institution: 'National Institute of Technology',
        user: { id: 'usr_cand_1' },
      },
    },
    questionAttempts: overrides?.questionAttempts || [],
  });

  beforeEach(async () => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue({ id: 'audit_log_1' }),
    };

    mockPrisma = {
      assessmentSession: {
        findUnique: jest.fn(),
      },
      assessment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      questionAttempt: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      },
      result: {
        upsert: jest.fn().mockImplementation(({ create }) => {
          return Promise.resolve({
            id: 'result_1',
            sessionId: create.sessionId,
            totalScore: create.totalScore,
            maximumScore: create.maximumScore,
            percentage: create.percentage,
            passed: create.passed,
            resultStatus: create.resultStatus,
            rank: 1,
            finalizedAt: create.finalizedAt,
          });
        }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
      },
      scoreCorrection: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ id: 'corr_1', ...data })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  describe('Objective Scoring & Negative Marking (FR-SCORE-001, FR-SCORE-002, TC-13)', () => {
    it('TC-13: should deduct negative marks when candidate submits an incorrect objective answer', async () => {
      // Question 1: single choice with wrong answer selected
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_1',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_1',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_1',
              questionId: 'q_mcq_single',
              sequenceNumber: 1,
              marksOverride: null,
              question: {
                id: 'q_mcq_single',
                questionType: QuestionType.MCQ_SINGLE,
                maximumMarks: new Decimal(4),
                negativeMarks: new Decimal(1),
                options: frozenPublishedSnapshot.questions[0].options,
              },
            },
            answers: [
              {
                id: 'ans_1',
                answerPayload: { selectedOptionId: 'opt_2' }, // opt_2 is WRONG
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      // TC-13 verification: -1.0 deducted for wrong answer
      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_1' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(-1.0),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );

      expect(mockPrisma.result.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            totalScore: new Decimal(-1.0),
            maximumScore: new Decimal(4.0),
            resultStatus: ResultStatus.FINAL,
          }),
        }),
      );
    });

    it('should award full credit when candidate selects the correct single-choice option', async () => {
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_1',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_1',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_1',
              questionId: 'q_mcq_single',
              sequenceNumber: 1,
              marksOverride: null,
              question: {
                id: 'q_mcq_single',
                questionType: QuestionType.MCQ_SINGLE,
                maximumMarks: new Decimal(4),
                negativeMarks: new Decimal(1),
                options: frozenPublishedSnapshot.questions[0].options,
              },
            },
            answers: [
              {
                id: 'ans_1',
                answerPayload: { selectedOptionId: 'opt_1' }, // opt_1 is CORRECT
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_1' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(4),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );
    });
  });

  describe('Multi-Select Partial Credit (FR-SCORE-003)', () => {
    it('should award proportional partial credit when a subset of correct options is selected without wrong options', async () => {
      // Question 2 has 3 correct options (opt_m1, opt_m2, opt_m3), total maxMarks = 6
      // Candidate selects 2 of 3 correct options (opt_m1, opt_m2) -> (2/3) * 6 = 4.0 marks
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_2',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_2',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_2',
              questionId: 'q_mcq_multi',
              sequenceNumber: 2,
              marksOverride: null,
              question: {
                id: 'q_mcq_multi',
                questionType: QuestionType.MCQ_MULTIPLE,
                maximumMarks: new Decimal(6),
                negativeMarks: new Decimal(1),
                options: frozenPublishedSnapshot.questions[1].options,
              },
            },
            answers: [
              {
                id: 'ans_2',
                answerPayload: { selectedOptionIds: ['opt_m1', 'opt_m2'] },
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_2' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(4.0),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );
    });

    it('should award full credit when all correct options are selected in multi-select', async () => {
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_2',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_2',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_2',
              questionId: 'q_mcq_multi',
              sequenceNumber: 2,
              marksOverride: null,
              question: {
                id: 'q_mcq_multi',
                questionType: QuestionType.MCQ_MULTIPLE,
                maximumMarks: new Decimal(6),
                negativeMarks: new Decimal(1),
                options: frozenPublishedSnapshot.questions[1].options,
              },
            },
            answers: [
              {
                id: 'ans_2',
                answerPayload: { selectedOptionIds: ['opt_m1', 'opt_m2', 'opt_m3'] },
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_2' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(6),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );
    });

    it('should forfeit credit and apply negative marking if candidate includes any wrong option in multi-select', async () => {
      // Candidate selects 2 correct options and 1 WRONG option (opt_m4)
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_2',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_2',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_2',
              questionId: 'q_mcq_multi',
              sequenceNumber: 2,
              marksOverride: null,
              question: {
                id: 'q_mcq_multi',
                questionType: QuestionType.MCQ_MULTIPLE,
                maximumMarks: new Decimal(6),
                negativeMarks: new Decimal(1),
                options: frozenPublishedSnapshot.questions[1].options,
              },
            },
            answers: [
              {
                id: 'ans_2',
                answerPayload: { selectedOptionIds: ['opt_m1', 'opt_m2', 'opt_m4'] },
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_2' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(-1.0),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );
    });
  });

  describe('Unanswered and Timed-Out Rules (FR-SCORE-006)', () => {
    it('should award 0 marks for skipped or unanswered timed-out questions', async () => {
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_timed_out',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_1',
            attemptStatus: AttemptState.TIMED_OUT,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_1',
              questionId: 'q_mcq_single',
              sequenceNumber: 1,
              marksOverride: null,
              question: {
                id: 'q_mcq_single',
                questionType: QuestionType.MCQ_SINGLE,
                maximumMarks: new Decimal(4),
                negativeMarks: new Decimal(1),
                options: frozenPublishedSnapshot.questions[0].options,
              },
            },
            answers: [], // Zero answers submitted
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_timed_out' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(0),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );
    });
  });

  describe('Provisional vs Final Lifecycle (FR-SCORE-008, UC-14)', () => {
    it('should mark result PROVISIONAL if subjective questions are awaiting manual evaluation', async () => {
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_subj_1',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_4',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_4',
              questionId: 'q_subjective',
              sequenceNumber: 4,
              marksOverride: null,
              question: {
                id: 'q_subjective',
                questionType: QuestionType.SHORT_ANSWER,
                maximumMarks: new Decimal(5),
                negativeMarks: new Decimal(0),
                options: [],
              },
            },
            answers: [
              {
                id: 'ans_subj',
                answerPayload: { text: 'Inverted indexes map words to document locations...' },
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_subj_1' },
          data: expect.objectContaining({
            attemptStatus: AttemptState.EVALUATION_PENDING,
          }),
        }),
      );

      expect(mockPrisma.result.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            resultStatus: ResultStatus.PROVISIONAL,
            finalizedAt: null,
          }),
        }),
      );
    });

    it('should transition result to FINAL when evaluator grades subjective item', async () => {
      const mockAttempt = {
        id: 'qa_subj_1',
        sessionId: 'session_test_1',
        assessmentQuestion: {
          marksOverride: null,
          question: {
            maximumMarks: new Decimal(5),
          },
        },
        session: { id: 'session_test_1' },
      };

      mockPrisma.questionAttempt.findUnique.mockResolvedValue(mockAttempt);

      // Session after evaluation has no pending subjective questions
      const sessionAfterGrading = createMockSession({
        questionAttempts: [
          {
            id: 'qa_subj_1',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_4',
            attemptStatus: AttemptState.EVALUATED,
            awardedMarks: new Decimal(4.5),
            evaluatedAt: new Date(),
            assessmentQuestion: {
              id: 'aq_4',
              questionId: 'q_subjective',
              sequenceNumber: 4,
              marksOverride: null,
              question: {
                id: 'q_subjective',
                questionType: QuestionType.SHORT_ANSWER,
                maximumMarks: new Decimal(5),
                negativeMarks: new Decimal(0),
                options: [],
              },
            },
            answers: [{ answerPayload: { text: 'Candidate answer' }, submittedAt: new Date() }],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(sessionAfterGrading);

      const response = await service.evaluateQuestionAttempt(
        'evaluator_user_1',
        {
          questionAttemptId: 'qa_subj_1',
          marksAwarded: 4.5,
          evaluatorFeedback: 'Excellent explanation of inverted indices.',
        },
        'corr-eval-01',
        '127.0.0.1',
      );

      expect(response.marksAwarded).toBe(4.5);
      expect(response.sessionResultStatus).toBe(ResultStatus.FINAL);

      // Verify audit log created for manual evaluation (FR-AUD-001)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MANUAL_EVALUATION',
          actorUserId: 'evaluator_user_1',
          outcome: AuditOutcome.SUCCESS,
        }),
      );
    });
  });

  describe('Audited Score Correction (FR-SCORE-010, UC-15, TC-14)', () => {
    it('TC-14: should correct candidate score, persist score_correction record, recalculate total and rank, and write audit log', async () => {
      const existingSession = {
        id: 'session_test_1',
        assignment: { assessmentId: 'asmt_1' },
        result: {
          id: 'res_1',
          sessionId: 'session_test_1',
          totalScore: new Decimal(8.0),
          maximumScore: new Decimal(10.0),
          percentage: new Decimal(80.0),
          passed: false,
          resultStatus: ResultStatus.FINAL,
        },
        questionAttempts: [
          {
            id: 'qa_1',
            awardedMarks: new Decimal(3.0),
          },
          {
            id: 'qa_2',
            awardedMarks: new Decimal(5.0),
          },
        ],
      };

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(existingSession);
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'asmt_1',
        passingMarks: new Decimal(10.0),
      });

      mockPrisma.questionAttempt.findMany.mockResolvedValue([
        { id: 'qa_1', awardedMarks: new Decimal(5.0) }, // Revised from 3.0 to 5.0
        { id: 'qa_2', awardedMarks: new Decimal(5.0) },
      ]);

      mockPrisma.result.update.mockResolvedValue({
        id: 'res_1',
        totalScore: new Decimal(10.0),
        percentage: new Decimal(100.0),
        passed: true,
        resultStatus: ResultStatus.FINAL,
        rank: 1,
      });

      mockPrisma.result.findUnique.mockResolvedValue({
        id: 'res_1',
        rank: 1,
      });

      const response = await service.correctScore(
        'superadmin_user_1',
        {
          sessionId: 'session_test_1',
          questionAttemptId: 'qa_1',
          revisedScore: 5.0,
          reason: 'Typo in automated question option marking verified by committee',
        },
        'corr-tc-14',
        '10.0.0.5',
      );

      // 1. Verify score_correction created
      expect(mockPrisma.scoreCorrection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultId: 'res_1',
            questionAttemptId: 'qa_1',
            originalValue: new Decimal(3.0),
            revisedValue: new Decimal(5.0),
            reason: 'Typo in automated question option marking verified by committee',
            correctedBy: 'superadmin_user_1',
          }),
        }),
      );

      // 2. Verify audit record written (TC-14, FR-SCORE-010)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SCORE_CORRECTION',
          actorUserId: 'superadmin_user_1',
          metadata: expect.objectContaining({
            originalValue: 3.0,
            revisedValue: 5.0,
            newTotalScore: 10.0,
            reason: 'Typo in automated question option marking verified by committee',
          }),
        }),
      );

      // 3. Verify recalculated total score and rank
      expect(response.newTotalScore).toBe(10.0);
      expect(response.newPercentage).toBe(100.0);
      expect(response.newRank).toBe(1);
    });

    it('should reject score correction without mandatory reason', async () => {
      await expect(
        service.correctScore(
          'superadmin_user_1',
          {
            sessionId: 'session_test_1',
            revisedScore: 10.0,
            reason: '', // Empty reason
          },
          'corr-fail',
          '127.0.0.1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('Config-Version Consistency (BR-011)', () => {
    it('BR-011: should score against the published frozen snapshot even if question bank options were subsequently modified', async () => {
      // In live question bank, option 2 was changed to correct.
      // But in frozen snapshot, option 1 is the immutable correct answer.
      const mockSession = createMockSession({
        questionAttempts: [
          {
            id: 'qa_1',
            sessionId: 'session_test_1',
            assessmentQuestionId: 'aq_1',
            attemptStatus: AttemptState.SUBMITTED,
            awardedMarks: null,
            evaluatedAt: null,
            assessmentQuestion: {
              id: 'aq_1',
              questionId: 'q_mcq_single',
              sequenceNumber: 1,
              marksOverride: null,
              question: {
                id: 'q_mcq_single',
                questionType: QuestionType.MCQ_SINGLE,
                maximumMarks: new Decimal(4),
                negativeMarks: new Decimal(1),
                // Live question bank modified destructively:
                options: [
                  { id: 'opt_1', optionText: 'Option A (Wrong in live DB)', isCorrect: false },
                  { id: 'opt_2', optionText: 'Option B (Correct in live DB)', isCorrect: true },
                ],
              },
            },
            answers: [
              {
                id: 'ans_1',
                answerPayload: { selectedOptionId: 'opt_1' }, // Matches snapshot correct option
                submittedAt: new Date(),
              },
            ],
            codingSubmissions: [],
          },
        ],
      });

      mockPrisma.assessmentSession.findUnique.mockResolvedValue(mockSession);

      await service.evaluateSession('session_test_1');

      // Must be awarded 4 marks because frozen snapshot has opt_1 as correct!
      expect(mockPrisma.questionAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa_1' },
          data: expect.objectContaining({
            awardedMarks: new Decimal(4),
            attemptStatus: AttemptState.EVALUATED,
          }),
        }),
      );
    });
  });

  describe('Deterministic Tie-Break Ranking (FR-SCORE-009)', () => {
    it('should rank candidates by score desc, fewer deductions, and earlier submittedAt', async () => {
      const candidate1 = {
        id: 'res_c1',
        totalScore: new Decimal(80),
        session: {
          submittedAt: new Date('2026-10-25T10:30:00Z'),
          questionAttempts: [{ awardedMarks: new Decimal(-1) }], // 1 deduction
        },
      };

      const candidate2 = {
        id: 'res_c2',
        totalScore: new Decimal(80),
        session: {
          submittedAt: new Date('2026-10-25T10:35:00Z'),
          questionAttempts: [{ awardedMarks: new Decimal(0) }], // 0 deductions (higher accuracy)
        },
      };

      const candidate3 = {
        id: 'res_c3',
        totalScore: new Decimal(95),
        session: {
          submittedAt: new Date('2026-10-25T11:00:00Z'),
          questionAttempts: [],
        },
      };

      mockPrisma.result.findMany.mockResolvedValue([candidate1, candidate2, candidate3]);

      await service.recalculateAssessmentRankings('asmt_1');

      // Highest score (candidate3) should be rank 1
      expect(mockPrisma.result.update).toHaveBeenCalledWith({
        where: { id: 'res_c3' },
        data: { rank: 1 },
      });

      // Candidate 2 and 1 both have score 80.
      // Candidate 2 has 0 deductions vs Candidate 1's 1 deduction -> Candidate 2 is rank 2, Candidate 1 is rank 3
      expect(mockPrisma.result.update).toHaveBeenCalledWith({
        where: { id: 'res_c2' },
        data: { rank: 2 },
      });

      expect(mockPrisma.result.update).toHaveBeenCalledWith({
        where: { id: 'res_c1' },
        data: { rank: 3 },
      });
    });
  });
});
