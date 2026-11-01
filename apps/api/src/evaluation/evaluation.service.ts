import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ApiErrorCode,
  AttemptState,
  AuditOutcome,
  QuestionType,
  ResultStatus,
  ManualEvaluationQueueItemDto,
  EvaluateQuestionDto,
  EvaluateQuestionResponseDto,
  ScoreCorrectionDto,
  ScoreCorrectionResponseDto,
} from '@verisync/shared';
import { ApiErrorException } from '../common/api-error.exception';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface PublishedSnapshotOption {
  id: string;
  optionText: string;
  displayOrder: number;
  isCorrect: boolean;
}

interface PublishedSnapshotQuestion {
  assessmentQuestionId?: string;
  questionId: string;
  sequenceNumber: number;
  marksOverride?: number | null;
  maximumMarks: number;
  negativeMarks: number;
  questionType: QuestionType;
  options?: PublishedSnapshotOption[];
}

interface PublishedSnapshot {
  publishedAt?: string;
  configurationVersion?: number;
  assessmentConfig?: {
    negativeMarking?: boolean;
    negativeMarkValue?: number | null;
    passingMarks?: number | null;
  };
  questions?: PublishedSnapshotQuestion[];
}

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Evaluate a completed session against assessment configuration and frozen snapshot (FR-SCORE-001..008, BR-011, TC-13).
   * - Evaluates objective questions (MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE) against the frozen snapshot key.
   * - Applies negative marking if enabled (FR-SCORE-002, TC-13).
   * - Computes partial credit for multi-select (FR-SCORE-003).
   * - Handles unanswered and timed-out questions (FR-SCORE-006).
   * - Sets result status to PROVISIONAL if manual items are pending, or FINAL if complete (FR-SCORE-008, UC-14).
   * - Calculates aggregate scores (FR-SCORE-007) and triggers ranking (FR-SCORE-009).
   */
  async evaluateSession(sessionId: string) {
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: {
            assessment: {
              include: {
                assessmentQuestions: {
                  include: {
                    question: {
                      include: {
                        options: true,
                        testCases: true,
                      },
                    },
                  },
                },
              },
            },
            candidate: {
              include: { user: true },
            },
          },
        },
        questionAttempts: {
          include: {
            assessmentQuestion: {
              include: {
                question: {
                  include: {
                    options: true,
                    testCases: true,
                  },
                },
              },
            },
            answers: {
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
            codingSubmissions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!session) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Session '${sessionId}' not found.`,
      );
    }

    const assessment = session.assignment.assessment;
    const rawSnapshot = assessment.publishedSnapshot as PublishedSnapshot | null;

    // BR-011: Config-version consistency - scoring against frozen snapshot if available
    const snapshotQuestionMap = new Map<string, PublishedSnapshotQuestion>();
    if (rawSnapshot && Array.isArray(rawSnapshot.questions)) {
      for (const sq of rawSnapshot.questions) {
        snapshotQuestionMap.set(sq.questionId, sq);
        if (sq.assessmentQuestionId) {
          snapshotQuestionMap.set(sq.assessmentQuestionId, sq);
        }
      }
    }

    const isNegativeMarkingEnabled =
      rawSnapshot?.assessmentConfig?.negativeMarking ?? assessment.negativeMarking;
    const globalNegativeMarkValue =
      rawSnapshot?.assessmentConfig?.negativeMarkValue ??
      (assessment.negativeMarkValue !== null ? Number(assessment.negativeMarkValue) : 0);

    let hasPendingManualEvaluation = false;
    let totalScore = 0;
    let maximumScore = 0;

    // Evaluate each question attempt
    for (const attempt of session.questionAttempts) {
      const aq = attempt.assessmentQuestion;
      const question = aq.question;
      const snapshotQ = snapshotQuestionMap.get(aq.questionId) || snapshotQuestionMap.get(aq.id);

      const maxMarks =
        snapshotQ?.marksOverride ??
        (aq.marksOverride !== null ? Number(aq.marksOverride) : Number(question.maximumMarks));
      const negMarks =
        globalNegativeMarkValue > 0
          ? globalNegativeMarkValue
          : (snapshotQ?.negativeMarks ?? Number(question.negativeMarks));

      maximumScore += maxMarks;

      const qType = (snapshotQ?.questionType ?? question.questionType) as QuestionType;
      const latestAnswer = attempt.answers[0];

      // 1. Unanswered, skipped, or timed-out without an answer (FR-SCORE-006)
      if (
        attempt.attemptStatus === AttemptState.SKIPPED ||
        attempt.attemptStatus === AttemptState.TIMED_OUT ||
        !latestAnswer
      ) {
        if (!latestAnswer) {
          const awarded = 0;
          await this.prisma.questionAttempt.update({
            where: { id: attempt.id },
            data: {
              awardedMarks: new Decimal(awarded),
              attemptStatus: AttemptState.EVALUATED,
            },
          });
          totalScore += awarded;
          continue;
        }
      }

      // If already manually evaluated, preserve marks
      if (
        (qType === QuestionType.SHORT_ANSWER ||
          qType === QuestionType.DESCRIPTIVE ||
          qType === QuestionType.SCENARIO) &&
        attempt.evaluatedAt !== null &&
        attempt.attemptStatus === AttemptState.EVALUATED
      ) {
        const awarded = attempt.awardedMarks !== null ? Number(attempt.awardedMarks) : 0;
        totalScore += awarded;
        continue;
      }

      // 2. Subjective question types requiring manual grading (FR-SCORE-004)
      if (
        qType === QuestionType.SHORT_ANSWER ||
        qType === QuestionType.DESCRIPTIVE ||
        qType === QuestionType.SCENARIO
      ) {
        hasPendingManualEvaluation = true;
        await this.prisma.questionAttempt.update({
          where: { id: attempt.id },
          data: {
            attemptStatus: AttemptState.EVALUATION_PENDING,
            awardedMarks: attempt.awardedMarks !== null ? attempt.awardedMarks : new Decimal(0),
          },
        });
        totalScore += attempt.awardedMarks !== null ? Number(attempt.awardedMarks) : 0;
        continue;
      }

      // 3. Coding question evaluation
      if (qType === QuestionType.CODING || qType === QuestionType.SQL) {
        const latestCodeSub = attempt.codingSubmissions[0];
        if (latestCodeSub && latestCodeSub.awardedMarks !== null) {
          const awarded = Number(latestCodeSub.awardedMarks);
          await this.prisma.questionAttempt.update({
            where: { id: attempt.id },
            data: {
              awardedMarks: new Decimal(awarded),
              attemptStatus: AttemptState.EVALUATED,
            },
          });
          totalScore += awarded;
        } else {
          hasPendingManualEvaluation = true;
          await this.prisma.questionAttempt.update({
            where: { id: attempt.id },
            data: {
              attemptStatus: AttemptState.EVALUATION_PENDING,
            },
          });
        }
        continue;
      }

      // 4. Objective question evaluation (FR-SCORE-001..003, TC-13)
      const options = snapshotQ?.options ?? question.options;
      const answerPayload = latestAnswer.answerPayload as Record<string, unknown> | null;

      let marksAwarded = 0;

      if (qType === QuestionType.MCQ_SINGLE || qType === QuestionType.TRUE_FALSE) {
        const selectedOptionId =
          (answerPayload?.selectedOptionId as string) ||
          (answerPayload?.optionId as string) ||
          (answerPayload?.id as string);

        const correctOption = options.find((o) => o.isCorrect);

        if (correctOption && selectedOptionId && selectedOptionId === correctOption.id) {
          marksAwarded = maxMarks;
        } else {
          // Negative marking check (FR-SCORE-002, TC-13)
          if (isNegativeMarkingEnabled && negMarks > 0) {
            marksAwarded = -negMarks;
          } else {
            marksAwarded = 0;
          }
        }
      } else if (qType === QuestionType.MCQ_MULTIPLE) {
        // Multi-select partial credit logic (FR-SCORE-003)
        let selectedOptionIds: string[] = [];
        if (Array.isArray(answerPayload?.selectedOptionIds)) {
          selectedOptionIds = answerPayload.selectedOptionIds as string[];
        } else if (Array.isArray(answerPayload?.optionIds)) {
          selectedOptionIds = answerPayload.optionIds as string[];
        } else if (Array.isArray(answerPayload?.selectedIds)) {
          selectedOptionIds = answerPayload.selectedIds as string[];
        } else if (Array.isArray(answerPayload)) {
          selectedOptionIds = answerPayload as string[];
        }

        const correctOptionIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
        const wrongOptionIds = new Set(options.filter((o) => !o.isCorrect).map((o) => o.id));

        const hasSelectedWrong = selectedOptionIds.some((id) => wrongOptionIds.has(id));

        if (hasSelectedWrong) {
          // Selecting wrong option forfeits marks, applies negative marking if configured
          if (isNegativeMarkingEnabled && negMarks > 0) {
            marksAwarded = -negMarks;
          } else {
            marksAwarded = 0;
          }
        } else {
          // Candidate selected only correct options
          const correctSelectedCount = selectedOptionIds.filter((id) =>
            correctOptionIds.has(id),
          ).length;

          if (correctSelectedCount === correctOptionIds.size && correctOptionIds.size > 0) {
            // Full credit
            marksAwarded = maxMarks;
          } else if (correctSelectedCount > 0 && correctOptionIds.size > 0) {
            // Partial credit (FR-SCORE-003)
            marksAwarded = (correctSelectedCount / correctOptionIds.size) * maxMarks;
          } else {
            marksAwarded = 0;
          }
        }
      }

      await this.prisma.questionAttempt.update({
        where: { id: attempt.id },
        data: {
          awardedMarks: new Decimal(marksAwarded),
          attemptStatus: AttemptState.EVALUATED,
        },
      });

      totalScore += marksAwarded;
    }

    // Determine result status (FR-SCORE-008, UC-14)
    const resultStatus = hasPendingManualEvaluation ? ResultStatus.PROVISIONAL : ResultStatus.FINAL;

    const percentage = maximumScore > 0 ? (totalScore / maximumScore) * 100 : 0;
    const passingMarks =
      rawSnapshot?.assessmentConfig?.passingMarks ??
      (assessment.passingMarks !== null ? Number(assessment.passingMarks) : null);
    const passed = passingMarks !== null ? totalScore >= passingMarks : null;
    const finalizedAt = resultStatus === ResultStatus.FINAL ? new Date() : null;

    // Upsert Result record
    const result = await this.prisma.result.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        totalScore: new Decimal(totalScore),
        maximumScore: new Decimal(maximumScore),
        percentage: new Decimal(percentage),
        passed,
        resultStatus,
        finalizedAt,
      },
      update: {
        totalScore: new Decimal(totalScore),
        maximumScore: new Decimal(maximumScore),
        percentage: new Decimal(percentage),
        passed,
        resultStatus,
        finalizedAt: resultStatus === ResultStatus.FINAL ? (finalizedAt ?? new Date()) : null,
      },
    });

    // If result is FINAL, recalculate deterministic cohort rankings (FR-SCORE-009)
    if (resultStatus === ResultStatus.FINAL) {
      await this.recalculateAssessmentRankings(assessment.id);
    }

    return result;
  }

  /**
   * Recalculate deterministic rankings for all final results in an assessment (FR-SCORE-009).
   * Tie-break order:
   * 1. Higher totalScore (descending)
   * 2. Fewer negative mark deductions / higher accuracy (ascending negative marks)
   * 3. Earlier completion timestamp submittedAt (ascending)
   */
  async recalculateAssessmentRankings(assessmentId: string) {
    const finalResults = await this.prisma.result.findMany({
      where: {
        resultStatus: ResultStatus.FINAL,
        session: {
          assignment: { assessmentId },
        },
      },
      include: {
        session: {
          include: {
            questionAttempts: {
              select: { awardedMarks: true },
            },
          },
        },
      },
    });

    if (finalResults.length === 0) {
      return;
    }

    // Compute ranking metrics for each candidate
    const candidatesWithMetrics = finalResults.map((r) => {
      const score = Number(r.totalScore);
      const submittedAt = r.session.submittedAt ? r.session.submittedAt.getTime() : Infinity;

      // Negative marks count as deductions (awardedMarks < 0)
      const negativeMarksDeducted = r.session.questionAttempts.reduce((sum, qa) => {
        const marks = qa.awardedMarks !== null ? Number(qa.awardedMarks) : 0;
        return marks < 0 ? sum + Math.abs(marks) : sum;
      }, 0);

      return {
        resultId: r.id,
        score,
        negativeMarksDeducted,
        submittedAt,
      };
    });

    // Sort according to approved tie-break criteria (FR-SCORE-009)
    candidatesWithMetrics.sort((a, b) => {
      // 1. Total score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 2. Fewer negative marks deducted (higher precision)
      if (a.negativeMarksDeducted !== b.negativeMarksDeducted) {
        return a.negativeMarksDeducted - b.negativeMarksDeducted;
      }
      // 3. Earlier completion timestamp
      return a.submittedAt - b.submittedAt;
    });

    // Assign standard competition ranks
    for (let i = 0; i < candidatesWithMetrics.length; i++) {
      const rank = i + 1;
      await this.prisma.result.update({
        where: { id: candidatesWithMetrics[i].resultId },
        data: { rank },
      });
    }
  }

  /**
   * Get queue of questions pending manual evaluation (FR-SCORE-004, UC-14).
   */
  async getEvaluationQueue(filters?: {
    assessmentId?: string;
  }): Promise<ManualEvaluationQueueItemDto[]> {
    const whereClause: Prisma.QuestionAttemptWhereInput = {
      attemptStatus: AttemptState.EVALUATION_PENDING,
    };

    if (filters?.assessmentId) {
      whereClause.session = {
        assignment: { assessmentId: filters.assessmentId },
      };
    }

    const attempts = await this.prisma.questionAttempt.findMany({
      where: whereClause,
      include: {
        session: {
          include: {
            assignment: {
              include: {
                assessment: true,
                candidate: {
                  include: { user: true },
                },
              },
            },
          },
        },
        assessmentQuestion: {
          include: {
            question: true,
          },
        },
        answers: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return attempts.map((a) => {
      const candidate = a.session.assignment.candidate;
      const assessment = a.session.assignment.assessment;
      const question = a.assessmentQuestion.question;
      const latestAnswer = a.answers[0];

      const maxMarks =
        a.assessmentQuestion.marksOverride !== null
          ? Number(a.assessmentQuestion.marksOverride)
          : Number(question.maximumMarks);

      return {
        questionAttemptId: a.id,
        sessionId: a.sessionId,
        candidateIdentifier: candidate.candidateIdentifier,
        candidateName: candidate.fullName,
        institution: candidate.institution,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        questionId: question.id,
        sequenceNumber: a.assessmentQuestion.sequenceNumber,
        questionType: question.questionType as QuestionType,
        questionText: question.questionText,
        codeSnippet: question.codeSnippet,
        maximumMarks: maxMarks,
        candidateAnswer: latestAnswer ? latestAnswer.answerPayload : null,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : a.createdAt.toISOString(),
      };
    });
  }

  /**
   * Submit manual evaluation with rubric marks and evaluator feedback (FR-SCORE-004, FR-SCORE-005, UC-14).
   */
  async evaluateQuestionAttempt(
    evaluatorUserId: string,
    dto: EvaluateQuestionDto,
    correlationId: string,
    clientIp: string,
  ): Promise<EvaluateQuestionResponseDto> {
    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: dto.questionAttemptId },
      include: {
        assessmentQuestion: {
          include: { question: true },
        },
        session: true,
      },
    });

    if (!attempt) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Question attempt '${dto.questionAttemptId}' not found.`,
      );
    }

    const maxMarks =
      attempt.assessmentQuestion.marksOverride !== null
        ? Number(attempt.assessmentQuestion.marksOverride)
        : Number(attempt.assessmentQuestion.question.maximumMarks);

    if (dto.marksAwarded < 0 || dto.marksAwarded > maxMarks) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Marks awarded (${dto.marksAwarded}) must be between 0 and maximum marks (${maxMarks}).`,
      );
    }

    const now = new Date();

    // Update question attempt with awarded marks, feedback, evaluator, and transition to EVALUATED
    await this.prisma.questionAttempt.update({
      where: { id: attempt.id },
      data: {
        awardedMarks: new Decimal(dto.marksAwarded),
        evaluatorFeedback: dto.evaluatorFeedback || null,
        evaluatedBy: evaluatorUserId,
        evaluatedAt: now,
        attemptStatus: AttemptState.EVALUATED,
      },
    });

    // Write audit log for manual grading (FR-AUD-001)
    await this.auditService.log({
      actorUserId: evaluatorUserId,
      eventType: 'MANUAL_EVALUATION',
      affectedEntity: `question_attempt:${attempt.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        sessionId: attempt.sessionId,
        questionAttemptId: attempt.id,
        marksAwarded: dto.marksAwarded,
        maxMarks,
        clientIp,
      },
    });

    // Recalculate session result and update PROVISIONAL -> FINAL if all items are complete
    const updatedResult = await this.evaluateSession(attempt.sessionId);

    return {
      questionAttemptId: attempt.id,
      marksAwarded: dto.marksAwarded,
      evaluatorFeedback: dto.evaluatorFeedback,
      evaluatedBy: evaluatorUserId,
      evaluatedAt: now.toISOString(),
      sessionResultStatus: updatedResult.resultStatus as ResultStatus,
    };
  }

  /**
   * Correct score with mandatory audit trail and recalculation of totals and ranks (FR-SCORE-010, UC-15, TC-14).
   */
  async correctScore(
    adminUserId: string,
    dto: ScoreCorrectionDto,
    correlationId: string,
    clientIp: string,
  ): Promise<ScoreCorrectionResponseDto> {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Mandatory justification reason required for score correction (FR-SCORE-010, UC-15).',
      );
    }

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        assignment: true,
        result: true,
        questionAttempts: true,
      },
    });

    if (!session || !session.result) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Result for session '${dto.sessionId}' does not exist.`,
      );
    }

    const result = session.result;
    const now = new Date();
    let originalValue = 0;

    if (dto.questionAttemptId) {
      const attempt = session.questionAttempts.find((qa) => qa.id === dto.questionAttemptId);
      if (!attempt) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          `Question attempt '${dto.questionAttemptId}' not found in session.`,
        );
      }
      originalValue = attempt.awardedMarks !== null ? Number(attempt.awardedMarks) : 0;

      // Update question attempt
      await this.prisma.questionAttempt.update({
        where: { id: attempt.id },
        data: {
          awardedMarks: new Decimal(dto.revisedScore),
          attemptStatus: AttemptState.EVALUATED,
        },
      });
    } else {
      originalValue = Number(result.totalScore);
    }

    // Persist immutable score correction record (SRS 9.1, TC-14)
    const correction = await this.prisma.scoreCorrection.create({
      data: {
        resultId: result.id,
        questionAttemptId: dto.questionAttemptId || null,
        originalValue: new Decimal(originalValue),
        revisedValue: new Decimal(dto.revisedScore),
        reason: dto.reason.trim(),
        correctedBy: adminUserId,
        correctedAt: now,
      },
    });

    // Recompute total marks
    let newTotalScore = 0;
    if (dto.questionAttemptId) {
      const refreshedAttempts = await this.prisma.questionAttempt.findMany({
        where: { sessionId: session.id },
      });
      newTotalScore = refreshedAttempts.reduce((sum, qa) => {
        return sum + (qa.awardedMarks !== null ? Number(qa.awardedMarks) : 0);
      }, 0);
    } else {
      newTotalScore = dto.revisedScore;
    }

    const maxScore = Number(result.maximumScore);
    const newPercentage = maxScore > 0 ? (newTotalScore / maxScore) * 100 : 0;

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: session.assignment.assessmentId },
    });
    const passingMarks =
      assessment?.passingMarks !== null ? Number(assessment?.passingMarks) : null;
    const passed = passingMarks !== null ? newTotalScore >= passingMarks : null;

    // Update result
    const updatedResult = await this.prisma.result.update({
      where: { id: result.id },
      data: {
        totalScore: new Decimal(newTotalScore),
        percentage: new Decimal(newPercentage),
        passed,
      },
    });

    // Recalculate rankings if result is FINAL
    if (updatedResult.resultStatus === ResultStatus.FINAL) {
      await this.recalculateAssessmentRankings(session.assignment.assessmentId);
    }

    const refreshedResult = await this.prisma.result.findUnique({
      where: { id: result.id },
    });

    // Mandatory audit trail (FR-SCORE-010, BR-012, TC-14, FR-AUD-001)
    await this.auditService.log({
      actorUserId: adminUserId,
      eventType: 'SCORE_CORRECTION',
      affectedEntity: `result:${result.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        sessionId: session.id,
        resultId: result.id,
        questionAttemptId: dto.questionAttemptId,
        originalValue,
        revisedValue: dto.revisedScore,
        newTotalScore,
        reason: dto.reason.trim(),
        clientIp,
      },
    });

    return {
      correction: {
        id: correction.id,
        resultId: correction.resultId,
        questionAttemptId: correction.questionAttemptId,
        originalValue: Number(correction.originalValue),
        revisedValue: Number(correction.revisedValue),
        reason: correction.reason,
        correctedBy: correction.correctedBy,
        correctedAt: correction.correctedAt.toISOString(),
      },
      newTotalScore,
      newPercentage,
      newRank: refreshedResult?.rank ?? null,
      resultStatus: updatedResult.resultStatus as ResultStatus,
    };
  }
}
