import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  MapAssessmentQuestionsDto,
  UpdateAssessmentStatusDto,
} from './dto/assessment.dto';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  AssessmentStatus,
  NavigationMode,
  ResultVisibility,
  AuditOutcome,
} from '@verisync/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create assessment with configurable parameters in DRAFT status (FR-ASMT-001, FR-ASMT-002).
   */
  async createAssessment(dto: CreateAssessmentDto, actorUserId: string, correlationId: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Invalid startAt or endAt timestamp format',
      );
    }

    if (endAt <= startAt) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'endAt must be strictly after startAt',
        { startAt: dto.startAt, endAt: dto.endAt },
      );
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        roleCategory: dto.roleCategory.trim(),
        overallDuration: dto.overallDuration,
        totalMarks: dto.totalMarks !== undefined ? new Decimal(dto.totalMarks) : null,
        passingMarks: dto.passingMarks !== undefined ? new Decimal(dto.passingMarks) : null,
        negativeMarking: Boolean(dto.negativeMarking),
        negativeMarkValue: new Decimal(dto.negativeMarkValue || 0),
        randomizeQuestions: Boolean(dto.randomizeQuestions),
        randomizeOptions: Boolean(dto.randomizeOptions),
        navigationMode: dto.navigationMode || NavigationMode.SEQUENTIAL,
        resultVisibility: dto.resultVisibility || ResultVisibility.ADMIN_RELEASE,
        startAt,
        endAt,
        status: AssessmentStatus.DRAFT,
        attemptLimit: dto.attemptLimit || 1,
        configurationVersion: 1,
        createdBy: actorUserId,
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_CREATED',
      affectedEntity: `assessment:${assessment.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: assessment.id,
        title: assessment.title,
        overallDuration: assessment.overallDuration,
        roleCategory: assessment.roleCategory,
      },
    });

    return this.formatAssessment(assessment);
  }

  /**
   * Search/filter assessments by status, roleCategory, and keyword.
   */
  async listAssessments(query: {
    status?: string;
    roleCategory?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status as AssessmentStatus;
    }
    if (query.roleCategory) {
      where.roleCategory = {
        contains: query.roleCategory.trim(),
        mode: 'insensitive',
      };
    }
    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, assessments] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              assessmentQuestions: true,
              assignments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: assessments.map((a) => ({
        ...this.formatAssessment(a),
        questionCount: a._count.assessmentQuestions,
        assignmentCount: a._count.assignments,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single assessment by ID with mapped questions (FR-ASMT-001).
   */
  async getAssessmentById(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        assessmentQuestions: {
          orderBy: { sequenceNumber: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { displayOrder: 'asc' } },
                testCases: true,
              },
            },
          },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!assessment) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Assessment '${id}' not found`);
    }

    return {
      ...this.formatAssessment(assessment),
      assignmentCount: assessment._count.assignments,
      questions: assessment.assessmentQuestions.map((aq) => ({
        assessmentQuestionId: aq.id,
        questionId: aq.questionId,
        sequenceNumber: aq.sequenceNumber,
        timeLimitSeconds: aq.timeLimitSeconds,
        marksOverride: aq.marksOverride !== null ? Number(aq.marksOverride) : null,
        questionVersion: aq.questionVersion,
        question: {
          id: aq.question.id,
          questionType: aq.question.questionType,
          questionText: aq.question.questionText,
          codeSnippet: aq.question.codeSnippet,
          topic: aq.question.topic,
          difficulty: aq.question.difficulty,
          maximumMarks: Number(aq.question.maximumMarks),
          negativeMarks: Number(aq.question.negativeMarks),
          options: aq.question.options.map((o) => ({
            id: o.id,
            optionText: o.optionText,
            displayOrder: o.displayOrder,
            isCorrect: o.isCorrect,
          })),
          testCases: aq.question.testCases.map((tc) => ({
            id: tc.id,
            inputData: tc.inputData,
            expectedOutput: tc.expectedOutput,
            visibility: tc.visibility,
            marks: Number(tc.marks),
          })),
        },
      })),
    };
  }

  /**
   * Edit assessment before candidate commencement (FR-ASMT-003).
   */
  async updateAssessment(
    id: string,
    dto: UpdateAssessmentDto,
    actorUserId: string,
    correlationId: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            sessions: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Assessment '${id}' not found`);
    }

    // Check if candidates have already commenced (FR-ASMT-003)
    const hasStartedSessions = assessment.assignments.some((a) =>
      a.sessions.some((s) => s.sessionStatus !== 'NOT_STARTED' && s.sessionStatus !== 'READY'),
    );

    if (hasStartedSessions) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Cannot modify assessment configuration after candidate attempts have commenced (FR-ASMT-003)',
      );
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : assessment.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : assessment.endAt;

    if (endAt <= startAt) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'endAt must be strictly after startAt',
      );
    }

    const updated = await this.prisma.assessment.update({
      where: { id },
      data: {
        title: dto.title?.trim() || undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        instructions: dto.instructions !== undefined ? dto.instructions?.trim() || null : undefined,
        roleCategory: dto.roleCategory?.trim() || undefined,
        overallDuration: dto.overallDuration || undefined,
        totalMarks: dto.totalMarks !== undefined ? new Decimal(dto.totalMarks) : undefined,
        passingMarks: dto.passingMarks !== undefined ? new Decimal(dto.passingMarks) : undefined,
        negativeMarking:
          dto.negativeMarking !== undefined ? Boolean(dto.negativeMarking) : undefined,
        negativeMarkValue:
          dto.negativeMarkValue !== undefined ? new Decimal(dto.negativeMarkValue) : undefined,
        randomizeQuestions:
          dto.randomizeQuestions !== undefined ? Boolean(dto.randomizeQuestions) : undefined,
        randomizeOptions:
          dto.randomizeOptions !== undefined ? Boolean(dto.randomizeOptions) : undefined,
        navigationMode: dto.navigationMode || undefined,
        resultVisibility: dto.resultVisibility || undefined,
        startAt,
        endAt,
        attemptLimit: dto.attemptLimit || undefined,
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_UPDATED',
      affectedEntity: `assessment:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: id,
        changes: dto,
      },
    });

    return this.getAssessmentById(id);
  }

  /**
   * Map questions to assessment with order and limits (FR-ASMT-002).
   * Validates that no question limit exceeds overall duration (FR-ASMT-004, UC-05, Decision 5).
   */
  async mapQuestions(
    id: string,
    dto: MapAssessmentQuestionsDto,
    actorUserId: string,
    correlationId: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { sessions: true },
        },
      },
    });

    if (!assessment) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Assessment '${id}' not found`);
    }

    const hasStartedSessions = assessment.assignments.some((a) =>
      a.sessions.some((s) => s.sessionStatus !== 'NOT_STARTED' && s.sessionStatus !== 'READY'),
    );
    if (hasStartedSessions) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Cannot modify questions on an assessment where candidate attempts have commenced (FR-ASMT-003)',
      );
    }

    const overallDurationSeconds = assessment.overallDuration * 60;
    const sequenceSet = new Set<number>();
    let totalQuestionLimitsSeconds = 0;

    // 1. Validate question constraints
    for (const qItem of dto.questions) {
      if (sequenceSet.has(qItem.sequenceNumber)) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          `Duplicate sequenceNumber '${qItem.sequenceNumber}' in question mappings`,
        );
      }
      sequenceSet.add(qItem.sequenceNumber);

      // FR-ASMT-004: Individual question limit cannot exceed overall duration
      if (qItem.timeLimitSeconds !== undefined && qItem.timeLimitSeconds !== null) {
        if (qItem.timeLimitSeconds > overallDurationSeconds) {
          throw new ApiErrorException(
            ApiErrorCode.VALIDATION_FAILED,
            `Question limit (${qItem.timeLimitSeconds}s) exceeds overall assessment duration (${overallDurationSeconds}s) (FR-ASMT-004, UC-05)`,
            {
              questionId: qItem.questionId,
              timeLimitSeconds: qItem.timeLimitSeconds,
              overallDurationSeconds,
            },
          );
        }
        totalQuestionLimitsSeconds += qItem.timeLimitSeconds;
      }
    }

    // FR-ASMT-004: In sequential assessments, sum of question limits cannot exceed overall duration
    if (
      assessment.navigationMode === NavigationMode.SEQUENTIAL &&
      totalQuestionLimitsSeconds > overallDurationSeconds
    ) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Sum of question time limits (${totalQuestionLimitsSeconds}s) exceeds overall assessment duration (${overallDurationSeconds}s) (FR-ASMT-004, Decision 5)`,
        { totalQuestionLimitsSeconds, overallDurationSeconds },
      );
    }

    // 2. Verify all question IDs exist in Question bank
    const questionIds = dto.questions.map((q) => q.questionId);
    const existingQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, questionVersion: true, status: true },
    });

    if (existingQuestions.length !== questionIds.length) {
      const foundIds = new Set(existingQuestions.map((q) => q.id));
      const missingIds = questionIds.filter((qid) => !foundIds.has(qid));
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `One or more questions do not exist in the question bank: ${missingIds.join(', ')}`,
      );
    }

    const questionVersionMap = new Map<string, number>();
    existingQuestions.forEach((q) => questionVersionMap.set(q.id, q.questionVersion));

    // 3. Atomically replace assessment questions
    await this.prisma.$transaction(async (tx) => {
      await tx.assessmentQuestion.deleteMany({ where: { assessmentId: id } });

      for (const qItem of dto.questions) {
        await tx.assessmentQuestion.create({
          data: {
            assessmentId: id,
            questionId: qItem.questionId,
            sequenceNumber: qItem.sequenceNumber,
            timeLimitSeconds: qItem.timeLimitSeconds || null,
            marksOverride:
              qItem.marksOverride !== undefined && qItem.marksOverride !== null
                ? new Decimal(qItem.marksOverride)
                : null,
            questionVersion: questionVersionMap.get(qItem.questionId) || 1,
          },
        });
      }
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_QUESTIONS_MAPPED',
      affectedEntity: `assessment:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: id,
        questionCount: dto.questions.length,
      },
    });

    return this.getAssessmentById(id);
  }

  /**
   * Publish assessment: validates configuration, freezes immutable snapshot of config & questions, and transitions status (FR-ASMT-003, FR-ASMT-008, UC-05).
   */
  async publishAssessment(id: string, actorUserId: string, correlationId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        assessmentQuestions: {
          orderBy: { sequenceNumber: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { displayOrder: 'asc' } },
                testCases: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Assessment '${id}' not found`);
    }

    // Preconditions check (UC-05)
    if (assessment.assessmentQuestions.length === 0) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Cannot publish assessment without questions. Map questions first (UC-05).',
      );
    }

    if (assessment.endAt <= assessment.startAt) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'endAt must be strictly after startAt',
      );
    }

    const now = new Date();
    // Decide target status: if now is within window, ACTIVE; if before, SCHEDULED
    const targetStatus =
      now >= assessment.startAt && now < assessment.endAt
        ? AssessmentStatus.ACTIVE
        : AssessmentStatus.SCHEDULED;

    // Build authoritative immutable published snapshot (FR-ASMT-008, UC-05, TC09)
    const snapshot = {
      publishedAt: now.toISOString(),
      configurationVersion: assessment.configurationVersion,
      assessmentConfig: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        roleCategory: assessment.roleCategory,
        overallDuration: assessment.overallDuration,
        totalMarks: assessment.totalMarks !== null ? Number(assessment.totalMarks) : null,
        passingMarks: assessment.passingMarks !== null ? Number(assessment.passingMarks) : null,
        negativeMarking: assessment.negativeMarking,
        negativeMarkValue: Number(assessment.negativeMarkValue),
        randomizeQuestions: assessment.randomizeQuestions,
        randomizeOptions: assessment.randomizeOptions,
        navigationMode: assessment.navigationMode,
        resultVisibility: assessment.resultVisibility,
        startAt: assessment.startAt.toISOString(),
        endAt: assessment.endAt.toISOString(),
        attemptLimit: assessment.attemptLimit,
      },
      questions: assessment.assessmentQuestions.map((aq) => ({
        assessmentQuestionId: aq.id,
        questionId: aq.questionId,
        sequenceNumber: aq.sequenceNumber,
        timeLimitSeconds: aq.timeLimitSeconds,
        marksOverride: aq.marksOverride !== null ? Number(aq.marksOverride) : null,
        questionVersion: aq.question.questionVersion,
        questionType: aq.question.questionType,
        questionText: aq.question.questionText,
        codeSnippet: aq.question.codeSnippet,
        topic: aq.question.topic,
        difficulty: aq.question.difficulty,
        maximumMarks: Number(aq.question.maximumMarks),
        negativeMarks: Number(aq.question.negativeMarks),
        options: aq.question.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          displayOrder: o.displayOrder,
          isCorrect: o.isCorrect, // Stored safely in snapshot for server scoring; NEVER sent to candidate APIs
        })),
        testCases: aq.question.testCases.map((tc) => ({
          id: tc.id,
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          visibility: tc.visibility,
          marks: Number(tc.marks),
        })),
      })),
    };

    const updated = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: targetStatus,
        publishedSnapshot: snapshot as any,
        configurationVersion: { increment: 1 },
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_PUBLISHED',
      affectedEntity: `assessment:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: id,
        newStatus: targetStatus,
        configurationVersion: updated.configurationVersion,
        questionCount: assessment.assessmentQuestions.length,
      },
    });

    return this.getAssessmentById(id);
  }

  /**
   * Transition assessment status machine (FR-ASMT-005).
   * Validates allowed transitions between DRAFT, SCHEDULED, ACTIVE, COMPLETED, SUSPENDED, ARCHIVED.
   */
  async updateStatus(
    id: string,
    dto: UpdateAssessmentStatusDto,
    actorUserId: string,
    correlationId: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, `Assessment '${id}' not found`);
    }

    const currentStatus = assessment.status;
    const targetStatus = dto.status;

    // Disallow transitions out of ARCHIVED
    if (currentStatus === AssessmentStatus.ARCHIVED) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Cannot transition assessment out of ARCHIVED state',
      );
    }

    // Require publish workflow to transition from DRAFT to SCHEDULED or ACTIVE
    if (
      currentStatus === AssessmentStatus.DRAFT &&
      (targetStatus === AssessmentStatus.SCHEDULED || targetStatus === AssessmentStatus.ACTIVE)
    ) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Use the /publish endpoint to transition assessment from DRAFT to SCHEDULED/ACTIVE (UC-05)',
      );
    }

    const updated = await this.prisma.assessment.update({
      where: { id },
      data: { status: targetStatus },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_STATUS_CHANGED',
      affectedEntity: `assessment:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: id,
        oldStatus: currentStatus,
        newStatus: targetStatus,
        reason: dto.reason || 'Status transitioned by administrator',
      },
    });

    return this.formatAssessment(updated);
  }

  /**
   * Format assessment entity.
   */
  private formatAssessment(a: any) {
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      roleCategory: a.roleCategory,
      overallDuration: a.overallDuration,
      totalMarks: a.totalMarks !== null ? Number(a.totalMarks) : null,
      passingMarks: a.passingMarks !== null ? Number(a.passingMarks) : null,
      negativeMarking: a.negativeMarking,
      negativeMarkValue: a.negativeMarkValue !== null ? Number(a.negativeMarkValue) : 0,
      randomizeQuestions: a.randomizeQuestions,
      randomizeOptions: a.randomizeOptions,
      navigationMode: a.navigationMode as NavigationMode,
      resultVisibility: a.resultVisibility as ResultVisibility,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status as AssessmentStatus,
      attemptLimit: a.attemptLimit,
      configurationVersion: a.configurationVersion,
      publishedSnapshot: a.publishedSnapshot || null,
      createdBy: a.createdBy,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
