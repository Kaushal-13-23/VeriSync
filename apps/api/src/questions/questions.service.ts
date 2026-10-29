import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateQuestionDto, UpdateQuestionStatusDto } from './dto/question.dto';
import { ApiErrorException } from '../common/api-error.exception';
import { ApiErrorCode, QuestionType, TestCaseVisibility, AuditOutcome } from '@verisync/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate question structure and required fields before creation or publishing (FR-QB-007).
   */
  validateQuestion(dto: CreateQuestionDto) {
    if (!dto.questionText || dto.questionText.trim().length === 0) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, 'Question text is required', {
        field: 'questionText',
      });
    }
    if (!dto.topic || dto.topic.trim().length === 0) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, 'Topic is required', {
        field: 'topic',
      });
    }
    if (!dto.difficulty || dto.difficulty.trim().length === 0) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, 'Difficulty is required', {
        field: 'difficulty',
      });
    }
    if (dto.maximumMarks <= 0) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Maximum marks must be greater than 0',
        { field: 'maximumMarks' },
      );
    }

    // Objective question validation (FR-QB-004, FR-QB-007)
    if (dto.questionType === QuestionType.MCQ_SINGLE) {
      const options = dto.options || [];
      if (options.length < 2) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'Single MCQ must have at least 2 options',
          { field: 'options' },
        );
      }
      const correctCount = options.filter((o) => o.isCorrect === true).length;
      if (correctCount !== 1) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          `Single MCQ must have exactly 1 correct option, found ${correctCount}`,
          { field: 'options' },
        );
      }
    } else if (dto.questionType === QuestionType.MCQ_MULTIPLE) {
      const options = dto.options || [];
      if (options.length < 2) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'Multiple MCQ must have at least 2 options',
          { field: 'options' },
        );
      }
      const correctCount = options.filter((o) => o.isCorrect === true).length;
      if (correctCount < 1) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'Multiple MCQ must have at least 1 correct option',
          { field: 'options' },
        );
      }
    } else if (dto.questionType === QuestionType.TRUE_FALSE) {
      const options = dto.options || [];
      if (options.length !== 2) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'True/False question must have exactly 2 options (True and False)',
          { field: 'options' },
        );
      }
      const correctCount = options.filter((o) => o.isCorrect === true).length;
      if (correctCount !== 1) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'True/False question must have exactly 1 correct option',
          { field: 'options' },
        );
      }
    }

    // Coding & SQL test case validation (FR-QB-010, FR-CODE-003, FR-CODE-004)
    if (dto.questionType === QuestionType.CODING || dto.questionType === QuestionType.SQL) {
      const testCases = dto.testCases || [];
      const hasSample = testCases.some((t) => t.visibility === TestCaseVisibility.SAMPLE);
      const hasHidden = testCases.some((t) => t.visibility === TestCaseVisibility.HIDDEN);

      if (!hasSample) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'Coding/SQL question must have at least 1 sample test case (FR-CODE-003)',
          { field: 'testCases' },
        );
      }
      if (!hasHidden) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'Coding/SQL question must have at least 1 hidden test case (FR-CODE-004)',
          { field: 'testCases' },
        );
      }
    }
  }

  /**
   * Create question with options or test cases in question bank (FR-QB-001..006).
   */
  async createQuestion(dto: CreateQuestionDto, actorUserId: string, correlationId: string) {
    this.validateQuestion(dto);

    const question = await this.prisma.question.create({
      data: {
        questionType: dto.questionType,
        questionText: dto.questionText.trim(),
        codeSnippet: dto.codeSnippet?.trim() || null,
        topic: dto.topic.trim(),
        difficulty: dto.difficulty.trim(),
        maximumMarks: new Decimal(dto.maximumMarks),
        negativeMarks: new Decimal(dto.negativeMarks || 0),
        explanation: dto.explanation?.trim() || null,
        questionVersion: 1,
        status: 'ACTIVE',
        options:
          dto.options && dto.options.length > 0
            ? {
                create: dto.options.map((opt, idx) => ({
                  optionText: opt.optionText.trim(),
                  displayOrder: opt.displayOrder !== undefined ? opt.displayOrder : idx + 1,
                  isCorrect: Boolean(opt.isCorrect),
                })),
              }
            : undefined,
        testCases:
          dto.testCases && dto.testCases.length > 0
            ? {
                create: dto.testCases.map((tc) => ({
                  inputData: tc.inputData,
                  expectedOutput: tc.expectedOutput,
                  visibility: tc.visibility,
                  marks: new Decimal(tc.marks || 0),
                })),
              }
            : undefined,
      },
      include: {
        options: { orderBy: { displayOrder: 'asc' } },
        testCases: true,
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'QUESTION_CREATED',
      affectedEntity: `question:${question.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        questionId: question.id,
        questionType: question.questionType,
        topic: question.topic,
        difficulty: question.difficulty,
        maximumMarks: Number(question.maximumMarks),
      },
    });

    return this.formatQuestion(question);
  }

  /**
   * Search and filter questions by keyword, topic, difficulty, and type (FR-QB-007).
   */
  async listQuestions(query: {
    search?: string;
    topic?: string;
    difficulty?: string;
    questionType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.topic) {
      where.topic = { contains: query.topic.trim(), mode: 'insensitive' };
    }
    if (query.difficulty) {
      where.difficulty = { equals: query.difficulty.trim(), mode: 'insensitive' };
    }
    if (query.questionType) {
      where.questionType = query.questionType as QuestionType;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { questionText: { contains: s, mode: 'insensitive' } },
        { explanation: { contains: s, mode: 'insensitive' } },
        { topic: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options: { orderBy: { displayOrder: 'asc' } },
          testCases: true,
          _count: {
            select: { assessmentQuestions: true },
          },
        },
      }),
    ]);

    return {
      items: questions.map((q) => this.formatQuestion(q)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single question by ID with options and test cases (Admin/Evaluator only) (FR-QB-004).
   */
  async getQuestionById(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { displayOrder: 'asc' } },
        testCases: true,
      },
    });

    if (!question) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Question '${id}' not found`);
    }

    return this.formatQuestion(question);
  }

  /**
   * Edit question before or after assignment, enforcing version immutability (FR-QB-008).
   * If question is linked to active/scheduled assessments or attempts, questionVersion is incremented.
   */
  async updateQuestion(
    id: string,
    dto: CreateQuestionDto,
    actorUserId: string,
    correlationId: string,
  ) {
    this.validateQuestion(dto);

    const existing = await this.prisma.question.findUnique({
      where: { id },
      include: {
        assessmentQuestions: {
          include: {
            assessment: true,
          },
        },
      },
    });

    if (!existing) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Question '${id}' not found`);
    }

    // Check if question is used in any published/active/scheduled assessment
    const isUsedInActiveAssessment = existing.assessmentQuestions.some(
      (aq) =>
        aq.assessment.status === 'ACTIVE' ||
        aq.assessment.status === 'SCHEDULED' ||
        aq.assessment.status === 'COMPLETED',
    );

    const nextVersion = isUsedInActiveAssessment
      ? existing.questionVersion + 1
      : existing.questionVersion;

    // Replace options and test cases transactionally
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete old options and test cases
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      await tx.testCase.deleteMany({ where: { questionId: id } });

      // 2. Update question fields
      await tx.question.update({
        where: { id },
        data: {
          questionType: dto.questionType,
          questionText: dto.questionText.trim(),
          codeSnippet: dto.codeSnippet?.trim() || null,
          topic: dto.topic.trim(),
          difficulty: dto.difficulty.trim(),
          maximumMarks: new Decimal(dto.maximumMarks),
          negativeMarks: new Decimal(dto.negativeMarks || 0),
          explanation: dto.explanation?.trim() || null,
          questionVersion: nextVersion,
          options:
            dto.options && dto.options.length > 0
              ? {
                  create: dto.options.map((opt, idx) => ({
                    optionText: opt.optionText.trim(),
                    displayOrder: opt.displayOrder !== undefined ? opt.displayOrder : idx + 1,
                    isCorrect: Boolean(opt.isCorrect),
                  })),
                }
              : undefined,
          testCases:
            dto.testCases && dto.testCases.length > 0
              ? {
                  create: dto.testCases.map((tc) => ({
                    inputData: tc.inputData,
                    expectedOutput: tc.expectedOutput,
                    visibility: tc.visibility,
                    marks: new Decimal(tc.marks || 0),
                  })),
                }
              : undefined,
        },
      });
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'QUESTION_UPDATED',
      affectedEntity: `question:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        questionId: id,
        previousVersion: existing.questionVersion,
        newVersion: nextVersion,
        versionIncremented: isUsedInActiveAssessment,
      },
    });

    return this.getQuestionById(id);
  }

  /**
   * Question deactivation/archival preventing new usage without altering existing records (FR-QB-009).
   */
  async updateQuestionStatus(
    id: string,
    dto: UpdateQuestionStatusDto,
    actorUserId: string,
    correlationId: string,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });
    if (!question) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Question '${id}' not found`);
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: dto.status.toUpperCase() },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'QUESTION_STATUS_CHANGED',
      affectedEntity: `question:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        questionId: id,
        oldStatus: question.status,
        newStatus: updated.status,
        reason: dto.reason || 'Status updated by administrator',
      },
    });

    return this.formatQuestion(updated);
  }

  /**
   * Format question entity for administrative responses.
   */
  private formatQuestion(q: any) {
    return {
      id: q.id,
      questionType: q.questionType,
      questionText: q.questionText,
      codeSnippet: q.codeSnippet,
      topic: q.topic,
      difficulty: q.difficulty,
      maximumMarks: Number(q.maximumMarks),
      negativeMarks: Number(q.negativeMarks),
      questionVersion: q.questionVersion,
      status: q.status,
      explanation: q.explanation,
      options: (q.options || []).map((o: any) => ({
        id: o.id,
        optionText: o.optionText,
        displayOrder: o.displayOrder,
        isCorrect: o.isCorrect,
      })),
      testCases: (q.testCases || []).map((tc: any) => ({
        id: tc.id,
        inputData: tc.inputData,
        expectedOutput: tc.expectedOutput,
        visibility: tc.visibility,
        marks: Number(tc.marks),
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }
}
