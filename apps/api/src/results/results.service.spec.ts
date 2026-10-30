import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AuditOutcome,
  QuestionType,
  ResultStatus,
  ResultVisibility,
  AttemptState,
} from '@verisync/shared';
import { Decimal } from '@prisma/client/runtime/library';

describe('ResultsService & Reporting (FR-ADMIN-003..009, TC-09)', () => {
  let service: ResultsService;
  let mockPrisma: any;
  let mockAuditService: any;

  const mockCandidate = {
    id: 'cand_1',
    candidateIdentifier: 'CAN-2026-001',
    fullName: 'Kaushal Kumar Singh',
    email: 'kaushal@verisync.com',
    institution: 'NIT Trichy',
  };

  const mockAssessment = {
    id: 'asmt_1',
    title: 'Full Stack Developer Placement Test',
    resultVisibility: ResultVisibility.IMMEDIATE,
    endAt: new Date(Date.now() + 3600000), // In 1 hour
    status: 'ACTIVE',
    assessmentQuestions: [
      {
        id: 'aq_1',
        sequenceNumber: 1,
        marksOverride: null,
        question: {
          id: 'q_1',
          questionText: 'What is the time complexity of binary search?',
          questionType: QuestionType.MCQ_SINGLE,
          maximumMarks: new Decimal(4.0),
          negativeMarks: new Decimal(1.0),
        },
      },
    ],
    assignments: [],
  };

  const mockResult = {
    id: 'res_1',
    sessionId: 'sess_1',
    totalScore: new Decimal(8.0),
    maximumScore: new Decimal(10.0),
    percentage: new Decimal(80.0),
    passed: true,
    rank: 1,
    resultStatus: ResultStatus.FINAL,
    finalizedAt: new Date(),
    createdAt: new Date(),
    session: {
      id: 'sess_1',
      assignmentId: 'assign_1',
      submittedAt: new Date('2026-10-25T11:00:00Z'),
      createdAt: new Date('2026-10-25T10:00:00Z'),
      assignment: {
        candidateId: mockCandidate.id,
        assessmentId: mockAssessment.id,
        candidate: mockCandidate,
        assessment: mockAssessment,
      },
      questionAttempts: [
        {
          id: 'qa_1',
          awardedMarks: new Decimal(4.0),
          attemptStatus: AttemptState.EVALUATED,
          evaluatorFeedback: 'Correct answer selected.',
          evaluatedBy: 'sys_auto',
          evaluatedAt: new Date(),
          assessmentQuestion: {
            sequenceNumber: 1,
            marksOverride: null,
            question: {
              id: 'q_1',
              questionText: 'What is the time complexity of binary search?',
              questionType: QuestionType.MCQ_SINGLE,
              maximumMarks: new Decimal(4.0),
              negativeMarks: new Decimal(1.0),
            },
          },
          answers: [
            {
              answerPayload: { selectedOptionId: 'opt_1' },
              submittedAt: new Date(),
            },
          ],
        },
      ],
    },
    scoreCorrections: [],
  };

  beforeEach(async () => {
    mockAuditService = {
      log: jest.fn().mockResolvedValue({ id: 'audit_log_1' }),
    };

    mockPrisma = {
      result: {
        findMany: jest.fn().mockResolvedValue([mockResult]),
        findUnique: jest.fn().mockResolvedValue(mockResult),
        count: jest.fn().mockResolvedValue(1),
      },
      assessment: {
        findUnique: jest.fn().mockResolvedValue(mockAssessment),
      },
      candidateProfile: {
        findUnique: jest.fn().mockResolvedValue(mockCandidate),
      },
      assessmentAssignment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'assign_1',
          candidateId: mockCandidate.id,
          assessmentId: mockAssessment.id,
          assessment: mockAssessment,
          sessions: [
            {
              id: 'sess_1',
              attemptNumber: 1,
              result: mockResult,
            },
          ],
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ResultsService>(ResultsService);
  });

  describe('Filterable Results Listing (FR-ADMIN-003)', () => {
    it('should list candidate results with filters and pagination metadata', async () => {
      const response = await service.listResults({
        assessmentId: 'asmt_1',
        status: 'PASS',
        minScore: 5,
        maxScore: 10,
        page: 1,
        pageSize: 10,
      });

      expect(response.results.length).toBe(1);
      expect(response.results[0].candidateIdentifier).toBe('CAN-2026-001');
      expect(response.results[0].totalScore).toBe(8.0);
      expect(response.results[0].rank).toBe(1);
      expect(response.pagination.total).toBe(1);
      expect(response.pagination.totalPages).toBe(1);
    });
  });

  describe('Per-Question Detailed Result Breakdown (FR-ADMIN-005)', () => {
    it('should return per-question responses, awarded marks, and evaluator comments', async () => {
      const details = await service.getResultDetails('res_1');

      expect(details.result.id).toBe('res_1');
      expect(details.breakdown.length).toBe(1);
      expect(details.breakdown[0].questionId).toBe('q_1');
      expect(details.breakdown[0].marksAwarded).toBe(4.0);
      expect(details.breakdown[0].candidateResponse).toEqual({ selectedOptionId: 'opt_1' });
      expect(details.breakdown[0].evaluatorFeedback).toBe('Correct answer selected.');
    });
  });

  describe('CSV Export and Audit Trail (FR-ADMIN-004, FR-ADMIN-008)', () => {
    it('should export authorized results as CSV and create an audit log', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'asmt_1',
        title: 'Full Stack Developer Placement Test',
        assignments: [
          {
            candidate: mockCandidate,
            sessions: [
              {
                id: 'sess_1',
                submittedAt: new Date('2026-10-25T11:00:00Z'),
                result: mockResult,
              },
            ],
          },
        ],
      });

      const csvString = await service.exportResultsCsv(
        'asmt_1',
        'superadmin_user_1',
        'corr-export-01',
        '10.0.0.1',
      );

      // Verify CSV content headers and rows
      expect(csvString).toContain('Rank,Candidate ID,Candidate Name');
      expect(csvString).toContain('"CAN-2026-001"');
      expect(csvString).toContain('"Kaushal Kumar Singh"');
      expect(csvString).toContain('"Pass"');

      // Verify audit event written (FR-ADMIN-008)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'EXPORT_RESULTS',
          actorUserId: 'superadmin_user_1',
          affectedEntity: 'assessment:asmt_1',
          outcome: AuditOutcome.SUCCESS,
        }),
      );
    });
  });

  describe('Question & Assessment Statistics (FR-ADMIN-006, FR-ADMIN-009)', () => {
    it('should calculate difficulty index, discrimination index, and cohort metrics', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'asmt_1',
        title: 'Full Stack Developer Placement Test',
        assessmentQuestions: [
          {
            id: 'aq_1',
            sequenceNumber: 1,
            marksOverride: null,
            question: {
              id: 'q_1',
              questionText: 'Binary search question',
              questionType: QuestionType.MCQ_SINGLE,
              maximumMarks: new Decimal(4.0),
            },
          },
        ],
        assignments: [
          {
            sessions: [
              {
                id: 's_1',
                result: { totalScore: new Decimal(4.0), passed: true },
                questionAttempts: [
                  {
                    assessmentQuestionId: 'aq_1',
                    awardedMarks: new Decimal(4.0),
                    answers: [{ answerPayload: { opt: 1 } }],
                  },
                ],
              },
              {
                id: 's_2',
                result: { totalScore: new Decimal(0.0), passed: false },
                questionAttempts: [
                  {
                    assessmentQuestionId: 'aq_1',
                    awardedMarks: new Decimal(0.0),
                    answers: [{ answerPayload: { opt: 2 } }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const stats = await service.getAssessmentStatistics('asmt_1');

      expect(stats.totalCandidates).toBe(1);
      expect(stats.completedSessions).toBe(2);
      expect(stats.averageScore).toBe(2.0); // (4 + 0) / 2
      expect(stats.highestScore).toBe(4.0);
      expect(stats.lowestScore).toBe(0.0);
      expect(stats.passingPercentage).toBe(50.0);

      // Question-level statistics
      expect(stats.questions.length).toBe(1);
      expect(stats.questions[0].totalAttempts).toBe(2);
      expect(stats.questions[0].correctAttempts).toBe(1);
      expect(stats.questions[0].difficultyIndex).toBe(0.5); // 1 out of 2 correct
    });
  });

  describe('Candidate Result Visibility Policy (FR-ADMIN-007, BR-009, TC-09)', () => {
    it('should allow candidate to view score under IMMEDIATE policy without exposing answer keys', async () => {
      const candidateView = await service.getCandidateResult('usr_cand_1', 'asmt_1');

      expect(candidateView.canViewScore).toBe(true);
      expect(candidateView.totalScore).toBe(8.0);
      expect(candidateView.percentage).toBe(80.0);
      expect(candidateView.rank).toBe(1);
      expect(candidateView.passed).toBe(true);
      // Strictly verify no answer keys or test cases in candidate response (TC-09)
      expect((candidateView as any).options).toBeUndefined();
      expect((candidateView as any).testCases).toBeUndefined();
    });

    it('should hold back score under SCHEDULED policy before assessment endAt', async () => {
      mockPrisma.assessmentAssignment.findUnique.mockResolvedValue({
        id: 'assign_1',
        candidateId: mockCandidate.id,
        assessmentId: mockAssessment.id,
        assessment: {
          ...mockAssessment,
          resultVisibility: ResultVisibility.SCHEDULED,
          endAt: new Date(Date.now() + 1000000), // In future
        },
        sessions: [
          {
            id: 'sess_1',
            attemptNumber: 1,
            result: mockResult,
          },
        ],
      });

      const candidateView = await service.getCandidateResult('usr_cand_1', 'asmt_1');

      expect(candidateView.canViewScore).toBe(false);
      expect(candidateView.totalScore).toBeUndefined();
      expect(candidateView.visibilityNotice).toContain(
        'Results will be published after the assessment window closes',
      );
    });

    it('should hold back score under ADMIN_RELEASE policy until published by admin', async () => {
      mockPrisma.assessmentAssignment.findUnique.mockResolvedValue({
        id: 'assign_1',
        candidateId: mockCandidate.id,
        assessmentId: mockAssessment.id,
        assessment: {
          ...mockAssessment,
          resultVisibility: ResultVisibility.ADMIN_RELEASE,
          status: 'ACTIVE', // Not yet COMPLETED
        },
        sessions: [
          {
            id: 'sess_1',
            attemptNumber: 1,
            result: mockResult,
          },
        ],
      });

      const candidateView = await service.getCandidateResult('usr_cand_1', 'asmt_1');

      expect(candidateView.canViewScore).toBe(false);
      expect(candidateView.visibilityNotice).toContain(
        'Results will be published upon administrator release.',
      );
    });
  });
});
