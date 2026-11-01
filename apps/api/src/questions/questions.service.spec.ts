import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../common/prisma.service';
import { ApiErrorException } from '../common/api-error.exception';
import { QuestionType, TestCaseVisibility } from '@verisync/shared';

describe('QuestionsService (FR-QB-001..010)', () => {
  let service: QuestionsService;
  let questionsStore: any[] = [];
  let optionsStore: any[] = [];
  let testCasesStore: any[] = [];
  let auditLogsStore: any[] = [];

  beforeEach(async () => {
    questionsStore = [];
    optionsStore = [];
    testCasesStore = [];
    auditLogsStore = [];

    const prismaMock: any = {
      question: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newQ = {
            id: `q_${Date.now()}_${Math.random()}`,
            questionType: data.questionType,
            questionText: data.questionText,
            codeSnippet: data.codeSnippet || null,
            topic: data.topic,
            difficulty: data.difficulty,
            maximumMarks: data.maximumMarks,
            negativeMarks: data.negativeMarks,
            questionVersion: data.questionVersion || 1,
            status: data.status || 'ACTIVE',
            explanation: data.explanation || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          questionsStore.push(newQ);

          const qOptions: any[] = [];
          if (data.options?.create) {
            data.options.create.forEach((o: any, idx: number) => {
              const opt = {
                id: `opt_${Date.now()}_${idx}`,
                questionId: newQ.id,
                optionText: o.optionText,
                displayOrder: o.displayOrder,
                isCorrect: Boolean(o.isCorrect),
              };
              optionsStore.push(opt);
              qOptions.push(opt);
            });
          }

          const qTestCases: any[] = [];
          if (data.testCases?.create) {
            data.testCases.create.forEach((tc: any, idx: number) => {
              const testCase = {
                id: `tc_${Date.now()}_${idx}`,
                questionId: newQ.id,
                inputData: tc.inputData,
                expectedOutput: tc.expectedOutput,
                visibility: tc.visibility,
                marks: tc.marks,
              };
              testCasesStore.push(testCase);
              qTestCases.push(testCase);
            });
          }

          return Promise.resolve({
            ...newQ,
            options: qOptions,
            testCases: qTestCases,
          });
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const q = questionsStore.find((item) => item.id === where.id);
          if (!q) return Promise.resolve(null);
          const opts = optionsStore.filter((o) => o.questionId === q.id);
          const tcs = testCasesStore.filter((tc) => tc.questionId === q.id);
          return Promise.resolve({
            ...q,
            options: opts,
            testCases: tcs,
            assessmentQuestions: q.assessmentQuestions || [],
          });
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          let results = [...questionsStore];
          if (where?.topic?.contains) {
            results = results.filter((q) =>
              q.topic.toLowerCase().includes(where.topic.contains.toLowerCase()),
            );
          }
          if (where?.questionType) {
            results = results.filter((q) => q.questionType === where.questionType);
          }
          return Promise.resolve(
            results.map((q) => {
              const opts = optionsStore.filter((o) => o.questionId === q.id);
              const tcs = testCasesStore.filter((tc) => tc.questionId === q.id);
              return { ...q, options: opts, testCases: tcs };
            }),
          );
        }),
        count: jest.fn().mockImplementation(() => Promise.resolve(questionsStore.length)),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const q = questionsStore.find((item) => item.id === where.id);
          if (q) {
            Object.assign(q, data);
            return Promise.resolve({
              ...q,
              options: optionsStore.filter((o) => o.questionId === q.id),
              testCases: testCasesStore.filter((tc) => tc.questionId === q.id),
            });
          }
          return Promise.resolve(null);
        }),
      },
      questionOption: {
        deleteMany: jest.fn().mockImplementation(({ where }: any) => {
          optionsStore = optionsStore.filter((o) => o.questionId !== where.questionId);
          return Promise.resolve({ count: 1 });
        }),
      },
      testCase: {
        deleteMany: jest.fn().mockImplementation(({ where }: any) => {
          testCasesStore = testCasesStore.filter((tc) => tc.questionId !== where.questionId);
          return Promise.resolve({ count: 1 });
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        return cb(prismaMock);
      }),
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
        QuestionsService,
        AuditService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  describe('createQuestion (FR-QB-001..004)', () => {
    it('creates single MCQ with validated option count and exact single correct answer', async () => {
      const q = await service.createQuestion(
        {
          questionType: QuestionType.MCQ_SINGLE,
          questionText: 'What is the time complexity of quickselect on average?',
          topic: 'Data Structures & Algorithms',
          difficulty: 'Medium',
          maximumMarks: 2,
          negativeMarks: 0.5,
          options: [
            { optionText: 'O(N)', displayOrder: 1, isCorrect: true },
            { optionText: 'O(N log N)', displayOrder: 2, isCorrect: false },
            { optionText: 'O(N^2)', displayOrder: 3, isCorrect: false },
            { optionText: 'O(1)', displayOrder: 4, isCorrect: false },
          ],
        },
        'admin_1',
        'corr-q-1',
      );

      expect(q.id).toBeDefined();
      expect(q.questionType).toBe(QuestionType.MCQ_SINGLE);
      expect(q.options.length).toBe(4);
      expect(q.options.find((o: any) => o.isCorrect)?.optionText).toBe('O(N)');
      expect(q.questionVersion).toBe(1);
    });

    it('rejects single MCQ if zero or multiple options are marked correct (FR-QB-004, FR-QB-007)', async () => {
      // 0 correct options
      await expect(
        service.createQuestion(
          {
            questionType: QuestionType.MCQ_SINGLE,
            questionText: 'Invalid MCQ Question',
            topic: 'DSA',
            difficulty: 'Easy',
            maximumMarks: 1,
            options: [
              { optionText: 'Option A', displayOrder: 1, isCorrect: false },
              { optionText: 'Option B', displayOrder: 2, isCorrect: false },
            ],
          },
          'admin_1',
          'corr-q-2',
        ),
      ).rejects.toThrow(ApiErrorException);

      // 2 correct options
      await expect(
        service.createQuestion(
          {
            questionType: QuestionType.MCQ_SINGLE,
            questionText: 'Invalid MCQ Question 2',
            topic: 'DSA',
            difficulty: 'Easy',
            maximumMarks: 1,
            options: [
              { optionText: 'Option A', displayOrder: 1, isCorrect: true },
              { optionText: 'Option B', displayOrder: 2, isCorrect: true },
            ],
          },
          'admin_1',
          'corr-q-3',
        ),
      ).rejects.toThrow(ApiErrorException);
    });

    it('creates coding problem with validated sample and hidden test cases (FR-QB-010, FR-CODE-003, FR-CODE-004)', async () => {
      const q = await service.createQuestion(
        {
          questionType: QuestionType.CODING,
          questionText: 'Write a function to find the maximum subarray sum (Kadane algorithm).',
          codeSnippet: 'def max_subarray(arr):\n    pass',
          topic: 'Algorithms',
          difficulty: 'Hard',
          maximumMarks: 10,
          testCases: [
            {
              inputData: '[-2,1,-3,4,-1,2,1,-5,4]',
              expectedOutput: '6',
              visibility: TestCaseVisibility.SAMPLE,
              marks: 2,
            },
            {
              inputData: '[5,4,-1,7,8]',
              expectedOutput: '23',
              visibility: TestCaseVisibility.HIDDEN,
              marks: 8,
            },
          ],
        },
        'admin_1',
        'corr-q-code',
      );

      expect(q.id).toBeDefined();
      expect(q.testCases?.length).toBe(2);
      expect(q.testCases?.some((tc: any) => tc.visibility === TestCaseVisibility.SAMPLE)).toBe(
        true,
      );
      expect(q.testCases?.some((tc: any) => tc.visibility === TestCaseVisibility.HIDDEN)).toBe(
        true,
      );
    });

    it('rejects coding problem missing hidden test case (FR-QB-010, FR-CODE-004)', async () => {
      await expect(
        service.createQuestion(
          {
            questionType: QuestionType.CODING,
            questionText: 'Coding question without hidden test case',
            topic: 'Algorithms',
            difficulty: 'Medium',
            maximumMarks: 5,
            testCases: [
              {
                inputData: '1 2',
                expectedOutput: '3',
                visibility: TestCaseVisibility.SAMPLE,
                marks: 5,
              },
            ],
          },
          'admin_1',
          'corr-q-err',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('version immutability (FR-QB-008)', () => {
    it('increments questionVersion when updating a question linked to an active assessment', async () => {
      const q = await service.createQuestion(
        {
          questionType: QuestionType.MCQ_SINGLE,
          questionText: 'Original text version 1',
          topic: 'OS',
          difficulty: 'Easy',
          maximumMarks: 1,
          options: [
            { optionText: 'True', displayOrder: 1, isCorrect: true },
            { optionText: 'False', displayOrder: 2, isCorrect: false },
          ],
        },
        'admin_1',
        'corr-v1',
      );

      expect(q.questionVersion).toBe(1);

      // Simulate linking question to an active assessment
      const storedQ = questionsStore.find((x) => x.id === q.id);
      storedQ.assessmentQuestions = [
        {
          assessment: { status: 'ACTIVE' },
        },
      ];

      // Update question content
      const updated = await service.updateQuestion(
        q.id,
        {
          questionType: QuestionType.MCQ_SINGLE,
          questionText: 'Updated text version 2',
          topic: 'OS',
          difficulty: 'Easy',
          maximumMarks: 1,
          options: [
            { optionText: 'Yes', displayOrder: 1, isCorrect: true },
            { optionText: 'No', displayOrder: 2, isCorrect: false },
          ],
        },
        'admin_1',
        'corr-v2',
      );

      expect(updated.questionVersion).toBe(2);
      expect(updated.questionText).toBe('Updated text version 2');
    });
  });
});
