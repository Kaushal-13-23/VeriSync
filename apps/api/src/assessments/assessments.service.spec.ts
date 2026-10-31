import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsService } from './assessments.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../common/prisma.service';
import { ApiErrorException } from '../common/api-error.exception';
import { AssessmentStatus, NavigationMode, ResultVisibility, QuestionType } from '@verisync/shared';
import { Decimal } from '@prisma/client/runtime/library';

describe('AssessmentsService (FR-ASMT-001..008, UC-05, Decision 5)', () => {
  let service: AssessmentsService;
  let assessmentsStore: any[] = [];
  let assessmentQuestionsStore: any[] = [];
  let questionsStore: any[] = [];
  let auditLogsStore: any[] = [];

  beforeEach(async () => {
    assessmentsStore = [];
    assessmentQuestionsStore = [];
    questionsStore = [];
    auditLogsStore = [];

    const prismaMock: any = {
      assessment: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newAsmt = {
            id: `asmt_${Date.now()}_${Math.random()}`,
            title: data.title,
            description: data.description || null,
            instructions: data.instructions || null,
            roleCategory: data.roleCategory,
            overallDuration: data.overallDuration,
            totalMarks: data.totalMarks || null,
            passingMarks: data.passingMarks || null,
            negativeMarking: data.negativeMarking || false,
            negativeMarkValue: data.negativeMarkValue || new Decimal(0),
            randomizeQuestions: data.randomizeQuestions || false,
            randomizeOptions: data.randomizeOptions || false,
            navigationMode: data.navigationMode || NavigationMode.SEQUENTIAL,
            resultVisibility: data.resultVisibility || ResultVisibility.ADMIN_RELEASE,
            startAt: data.startAt,
            endAt: data.endAt,
            status: data.status || AssessmentStatus.DRAFT,
            attemptLimit: data.attemptLimit || 1,
            configurationVersion: data.configurationVersion || 1,
            publishedSnapshot: data.publishedSnapshot || null,
            createdBy: data.createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          assessmentsStore.push(newAsmt);
          return Promise.resolve(newAsmt);
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const asmt = assessmentsStore.find((a) => a.id === where.id);
          if (!asmt) return Promise.resolve(null);
          const mapped = assessmentQuestionsStore
            .filter((aq) => aq.assessmentId === asmt.id)
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
            .map((aq) => {
              const q = questionsStore.find((item) => item.id === aq.questionId) || {
                id: aq.questionId,
                questionType: QuestionType.MCQ_SINGLE,
                questionText: 'Mock Question',
                topic: 'Algorithms',
                difficulty: 'Easy',
                maximumMarks: new Decimal(2),
                negativeMarks: new Decimal(0),
                questionVersion: aq.questionVersion || 1,
                options: [],
                testCases: [],
              };
              return { ...aq, question: q };
            });
          return Promise.resolve({
            ...asmt,
            assessmentQuestions: mapped,
            assignments: asmt.assignments || [],
            _count: { assignments: 0 },
          });
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const asmt = assessmentsStore.find((a) => a.id === where.id);
          if (asmt) {
            if (data.configurationVersion?.increment) {
              asmt.configurationVersion += 1;
              delete data.configurationVersion;
            }
            Object.assign(asmt, data);
            return Promise.resolve({ ...asmt });
          }
          return Promise.resolve(null);
        }),
        count: jest.fn().mockImplementation(() => Promise.resolve(assessmentsStore.length)),
        findMany: jest.fn().mockImplementation(() =>
          Promise.resolve(
            assessmentsStore.map((a) => ({
              ...a,
              _count: {
                assessmentQuestions: assessmentQuestionsStore.filter(
                  (aq) => aq.assessmentId === a.id,
                ).length,
                assignments: 0,
              },
            })),
          ),
        ),
      },
      question: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(questionsStore.filter((q) => where.id.in.includes(q.id)));
        }),
      },
      assessmentQuestion: {
        deleteMany: jest.fn().mockImplementation(({ where }: any) => {
          assessmentQuestionsStore = assessmentQuestionsStore.filter(
            (aq) => aq.assessmentId !== where.assessmentId,
          );
          return Promise.resolve({ count: 1 });
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newAq = {
            id: `aq_${Date.now()}_${Math.random()}`,
            assessmentId: data.assessmentId,
            questionId: data.questionId,
            sequenceNumber: data.sequenceNumber,
            timeLimitSeconds: data.timeLimitSeconds,
            marksOverride: data.marksOverride,
            questionVersion: data.questionVersion,
          };
          assessmentQuestionsStore.push(newAq);
          return Promise.resolve(newAq);
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prismaMock)),
      auditLog: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const entry = { id: `aud_${Date.now()}`, ...data, eventTimestamp: new Date() };
          auditLogsStore.push(entry);
          return Promise.resolve(entry);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        AuditService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  describe('createAssessment (FR-ASMT-001, FR-ASMT-002)', () => {
    it('creates assessment in DRAFT status with default sequential navigation and attempt limits', async () => {
      const startAt = new Date(Date.now() + 3600000).toISOString();
      const endAt = new Date(Date.now() + 7200000).toISOString();

      const asmt = await service.createAssessment(
        {
          title: 'Full Stack Engineer Assessment',
          description: 'Hiring drive round 1',
          roleCategory: 'Frontend & Backend',
          overallDuration: 60, // 60 minutes
          attemptLimit: 1,
          startAt,
          endAt,
          navigationMode: NavigationMode.SEQUENTIAL,
        },
        'admin_1',
        'corr-asmt-1',
      );

      expect(asmt.id).toBeDefined();
      expect(asmt.status).toBe(AssessmentStatus.DRAFT);
      expect(asmt.overallDuration).toBe(60);
      expect(asmt.navigationMode).toBe(NavigationMode.SEQUENTIAL);
      expect(asmt.attemptLimit).toBe(1);
    });

    it('rejects assessment when endAt is earlier than startAt', async () => {
      const startAt = new Date(Date.now() + 7200000).toISOString();
      const endAt = new Date(Date.now() + 3600000).toISOString();

      await expect(
        service.createAssessment(
          {
            title: 'Invalid Schedule',
            roleCategory: 'Engineering',
            overallDuration: 30,
            startAt,
            endAt,
          },
          'admin_1',
          'corr-asmt-err',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('mapQuestions duration validation (FR-ASMT-004, UC-05, Decision 5)', () => {
    it('rejects question limit that exceeds overall assessment duration', async () => {
      const asmt = await service.createAssessment(
        {
          title: 'Duration Test Assessment',
          roleCategory: 'Engineering',
          overallDuration: 10, // 10 minutes = 600 seconds
          startAt: new Date(Date.now() + 3600000).toISOString(),
          endAt: new Date(Date.now() + 7200000).toISOString(),
        },
        'admin_1',
        'corr-asmt-dur-1',
      );

      questionsStore.push({
        id: 'q_excessive',
        questionVersion: 1,
        questionType: QuestionType.CODING,
        maximumMarks: new Decimal(10),
      });

      // Question limit is 700s, exceeding overall duration of 600s
      await expect(
        service.mapQuestions(
          asmt.id,
          {
            questions: [
              {
                questionId: 'q_excessive',
                sequenceNumber: 1,
                timeLimitSeconds: 700,
              },
            ],
          },
          'admin_1',
          'corr-asmt-dur-2',
        ),
      ).rejects.toThrow(ApiErrorException);
    });

    it('rejects sequential question limits whose sum exceeds overall assessment duration (FR-ASMT-004, Decision 5)', async () => {
      const asmt = await service.createAssessment(
        {
          title: 'Sequential Sum Duration Test',
          roleCategory: 'Engineering',
          overallDuration: 5, // 5 minutes = 300 seconds
          navigationMode: NavigationMode.SEQUENTIAL,
          startAt: new Date(Date.now() + 3600000).toISOString(),
          endAt: new Date(Date.now() + 7200000).toISOString(),
        },
        'admin_1',
        'corr-seq-1',
      );

      questionsStore.push({ id: 'q_1', questionVersion: 1 }, { id: 'q_2', questionVersion: 1 });

      // Question 1: 200s, Question 2: 150s. Sum = 350s > 300s overall duration
      await expect(
        service.mapQuestions(
          asmt.id,
          {
            questions: [
              { questionId: 'q_1', sequenceNumber: 1, timeLimitSeconds: 200 },
              { questionId: 'q_2', sequenceNumber: 2, timeLimitSeconds: 150 },
            ],
          },
          'admin_1',
          'corr-seq-2',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('publishAssessment (FR-ASMT-003, FR-ASMT-008, UC-05)', () => {
    it('freezes immutable versioned snapshot of configuration and questions upon publish', async () => {
      const asmt = await service.createAssessment(
        {
          title: 'Publish Test Assessment',
          roleCategory: 'DevOps',
          overallDuration: 30,
          startAt: new Date(Date.now() + 3600000).toISOString(),
          endAt: new Date(Date.now() + 7200000).toISOString(),
        },
        'admin_1',
        'corr-pub-1',
      );

      questionsStore.push({
        id: 'q_publish_1',
        questionType: QuestionType.MCQ_SINGLE,
        questionText: 'What is Docker?',
        maximumMarks: new Decimal(2),
        negativeMarks: new Decimal(0),
        questionVersion: 1,
        options: [
          { id: 'opt_1', optionText: 'Container platform', displayOrder: 1, isCorrect: true },
          { id: 'opt_2', optionText: 'Virtual Machine', displayOrder: 2, isCorrect: false },
        ],
        testCases: [],
      });

      await service.mapQuestions(
        asmt.id,
        {
          questions: [{ questionId: 'q_publish_1', sequenceNumber: 1, timeLimitSeconds: 120 }],
        },
        'admin_1',
        'corr-pub-2',
      );

      const published = await service.publishAssessment(asmt.id, 'admin_1', 'corr-pub-3');

      expect(published.status).toBe(AssessmentStatus.SCHEDULED);
      expect(published.publishedSnapshot).toBeDefined();
      expect(published.publishedSnapshot.questions.length).toBe(1);
      expect(published.publishedSnapshot.questions[0].options[0].isCorrect).toBe(true);

      // Verify audit trail logged
      const pubAudit = auditLogsStore.find((a) => a.eventType === 'ASSESSMENT_PUBLISHED');
      expect(pubAudit).toBeDefined();
    });
  });

  describe('updateStatus machine (FR-ASMT-005)', () => {
    it('allows valid state machine transitions and blocks transitions out of ARCHIVED', async () => {
      const asmt = await service.createAssessment(
        {
          title: 'State Machine Assessment',
          roleCategory: 'QA',
          overallDuration: 45,
          startAt: new Date(Date.now() + 3600000).toISOString(),
          endAt: new Date(Date.now() + 7200000).toISOString(),
        },
        'admin_1',
        'corr-sm-1',
      );

      // 1. Moving DRAFT directly to ACTIVE without publishing is blocked
      await expect(
        service.updateStatus(asmt.id, { status: AssessmentStatus.ACTIVE }, 'admin_1', 'corr-sm-2'),
      ).rejects.toThrow(ApiErrorException);

      // Archive assessment
      await service.updateStatus(
        asmt.id,
        { status: AssessmentStatus.ARCHIVED, reason: 'Test archived' },
        'admin_1',
        'corr-sm-3',
      );

      // 2. Transitioning out of ARCHIVED is blocked
      await expect(
        service.updateStatus(asmt.id, { status: AssessmentStatus.ACTIVE }, 'admin_1', 'corr-sm-4'),
      ).rejects.toThrow(ApiErrorException);
    });
  });
});
