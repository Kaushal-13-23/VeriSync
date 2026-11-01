import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeRunnerClient, CodeRunnerTestCase } from './code-runner.client';
import { SqlSandboxService } from '../sql/sql-sandbox.service';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  AttemptState,
  AuditOutcome,
  CodeSubmissionResponseDto,
  CodeSubmissionStatusDto,
  ExecutionStatus,
  QuestionType,
  SessionState,
  SubmissionStatus,
  TestCaseSampleResultDto,
} from '@verisync/shared';
import { CreateCodeSubmissionDto } from './dto/code-submission.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CodingService {
  private readonly logger = new Logger(CodingService.name);
  private readonly MAX_INFRA_RETRIES = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly codeRunnerClient: CodeRunnerClient,
    private readonly sqlSandbox: SqlSandboxService,
  ) {}

  /**
   * Submit Code / SQL Query with Validation, Limits, Idempotency, and Queuing (FR-CODE-001..010, FR-SQL-001..005)
   */
  async submitCode(
    userId: string,
    sessionId: string,
    idempotencyKey: string,
    dto: CreateCodeSubmissionDto,
    correlationId: string,
    _clientIp: string,
  ): Promise<CodeSubmissionResponseDto> {
    const now = new Date();

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Idempotency-Key header is required for code submissions.',
      );
    }

    // 1. Fetch candidate and session
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Candidate record not found.');
    }

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: { assessment: true },
        },
      },
    });

    if (!session || session.assignment.candidateId !== candidate.id) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Session access denied.');
    }

    if (session.sessionStatus !== SessionState.ACTIVE) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Session is ${session.sessionStatus.toLowerCase()}.`,
      );
    }

    // 2. Fetch target question attempt and question
    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: dto.questionAttemptId },
      include: {
        assessmentQuestion: {
          include: {
            question: {
              include: {
                testCases: true,
              },
            },
          },
        },
      },
    });

    if (!attempt || attempt.sessionId !== sessionId) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Question attempt does not belong to this session.',
      );
    }

    if (attempt.attemptStatus !== AttemptState.ACTIVE) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Question attempt is ${attempt.attemptStatus.toLowerCase()}. Submissions accepted only for active attempts.`,
      );
    }

    // 3. Deadline check (FR-TIME-004)
    if (attempt.deadlineAt && now > attempt.deadlineAt) {
      throw new ApiErrorException(
        ApiErrorCode.QUESTION_EXPIRED,
        'The deadline for this question has expired.',
      );
    }

    const q = attempt.assessmentQuestion.question;
    if (q.questionType !== QuestionType.CODING && q.questionType !== QuestionType.SQL) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Question type '${q.questionType}' does not accept code submissions.`,
      );
    }

    // 4. Idempotency Check (FR-ANS-009, Rule 3)
    const existingSubmission = await this.prisma.codingSubmission.findUnique({
      where: {
        questionAttemptId_idempotencyKey: {
          questionAttemptId: attempt.id,
          idempotencyKey,
        },
      },
    });

    if (existingSubmission) {
      this.logger.log(`[submitCode] Idempotency cache hit: submission ${existingSubmission.id}`);
      return {
        submissionId: existingSubmission.id,
        questionAttemptId: attempt.id,
        status: existingSubmission.submissionStatus as SubmissionStatus,
        submittedAt: existingSubmission.createdAt.toISOString(),
      };
    }

    // 5. Enforce Per-Question Submission Limits (FR-CODE-010)
    const maxSubmissions = attempt.assessmentQuestion.maxSubmissions ?? q.maxSubmissions ?? 10;
    const priorSubmissionsCount = await this.prisma.codingSubmission.count({
      where: { questionAttemptId: attempt.id },
    });

    if (priorSubmissionsCount >= maxSubmissions) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Submission limit exceeded. Maximum of ${maxSubmissions} submissions permitted for this question (FR-CODE-010).`,
        { maxSubmissions, currentCount: priorSubmissionsCount },
      );
    }

    // 6. Durable persistence of submission with QUEUED status (Rule 4)
    const submission = await this.prisma.codingSubmission.create({
      data: {
        questionAttemptId: attempt.id,
        language: dto.language.toLowerCase(),
        sourceCode: dto.sourceCode,
        submissionStatus: SubmissionStatus.QUEUED,
        idempotencyKey,
      },
    });

    // 7. Audit logging
    await this.audit.log({
      actorUserId: userId,
      eventType: 'SUBMIT_CODE',
      affectedEntity: 'coding_submissions',
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        submissionId: submission.id,
        sessionId,
        questionAttemptId: attempt.id,
        language: dto.language,
        codeLength: dto.sourceCode.length,
      },
    });

    // 8. Enqueue asynchronous evaluation job
    this.enqueueEvaluationJob(submission.id, attempt.id, correlationId);

    return {
      submissionId: submission.id,
      questionAttemptId: attempt.id,
      status: SubmissionStatus.QUEUED,
      submittedAt: submission.createdAt.toISOString(),
    };
  }

  /**
   * Internal asynchronous job processor for code / SQL evaluation
   */
  private enqueueEvaluationJob(
    submissionId: string,
    questionAttemptId: string,
    correlationId: string,
  ): void {
    // Process asynchronously without blocking the client response thread
    setImmediate(async () => {
      await this.processSubmissionJob(submissionId, questionAttemptId, correlationId);
    });
  }

  /**
   * Execute and evaluate submission against isolated engine (SRS 8.5, FR-CODE-011, FR-SQL-001..005)
   */
  async processSubmissionJob(
    submissionId: string,
    questionAttemptId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      const submission = await this.prisma.codingSubmission.findUnique({
        where: { id: submissionId },
        include: {
          questionAttempt: {
            include: {
              assessmentQuestion: {
                include: {
                  question: {
                    include: {
                      testCases: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!submission) return;

      // Transition to RUNNING
      await this.prisma.codingSubmission.update({
        where: { id: submissionId },
        data: { submissionStatus: SubmissionStatus.RUNNING },
      });

      const q = submission.questionAttempt.assessmentQuestion.question;
      const aq = submission.questionAttempt.assessmentQuestion;
      const totalMarks = Number(aq.marksOverride ?? q.maximumMarks);

      if (submission.language === 'sql' || q.questionType === QuestionType.SQL) {
        // -------------------------------------------------------------------
        // SQL Assessment Evaluation (FR-SQL-001..005)
        // -------------------------------------------------------------------
        const sqlResult = await this.sqlSandbox.evaluateQuery({
          schemaSql: q.schemaDefinition || undefined,
          candidateQuery: submission.sourceCode,
          expectedOutputOrQuery: q.referenceSolution || undefined,
          options: {
            statementTimeoutMs: (aq.timeLimitSeconds || 3) * 1000,
            maxRows: 100,
          },
        });

        // Calculate marks for SQL
        let awardedMarks = 0;
        if (sqlResult.passed) {
          awardedMarks = totalMarks;
        }

        const sampleTestResults: TestCaseSampleResultDto[] = [
          {
            testCaseId: 'sql_test_case',
            passed: sqlResult.passed,
            actualOutput: JSON.stringify(sqlResult.rows.slice(0, 5)),
            executionTimeMs: sqlResult.executionTimeMs,
            errorMessage: sqlResult.errorMessage,
          },
        ];

        await this.prisma.codingSubmission.update({
          where: { id: submissionId },
          data: {
            submissionStatus: SubmissionStatus.COMPLETED,
            executionStatus: sqlResult.status,
            awardedMarks: new Decimal(awardedMarks),
            totalMarks: new Decimal(totalMarks),
            executionTimeMs: sqlResult.executionTimeMs,
            sampleTestResults: sampleTestResults as any,
            errorMessage: sqlResult.errorMessage,
          },
        });

        // Sync best marks to QuestionAttempt
        await this.syncAttemptMarks(questionAttemptId, awardedMarks);
      } else {
        // -------------------------------------------------------------------
        // Programming Language Evaluation (FR-CODE-001..014, SRS 8.5)
        // -------------------------------------------------------------------
        const testCases: CodeRunnerTestCase[] = q.testCases.map((tc) => ({
          testCaseId: tc.id,
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          visibility: tc.visibility as 'SAMPLE' | 'HIDDEN',
        }));

        const limits = {
          timeLimitSeconds: aq.timeLimitSeconds || 3,
          memoryLimitMb: 256,
        };

        const runnerResult = await this.codeRunnerClient.execute({
          submissionId,
          language: submission.language,
          sourceCode: submission.sourceCode,
          limits,
          testCases,
        });

        // Infrastructure failure handling (FR-CODE-012, TC-12)
        if (runnerResult.isInfrastructureError) {
          if (submission.retryCount < this.MAX_INFRA_RETRIES) {
            this.logger.warn(
              `[processSubmissionJob] Infrastructure failure on ${submissionId}. Retrying (${submission.retryCount + 1}/${this.MAX_INFRA_RETRIES})...`,
            );
            await this.prisma.codingSubmission.update({
              where: { id: submissionId },
              data: {
                retryCount: { increment: 1 },
                submissionStatus: SubmissionStatus.QUEUED,
                isInfrastructureError: true,
                errorMessage: runnerResult.errorMessage,
              },
            });
            // Re-queue with exponential backoff delay
            const timer = setTimeout(
              () => {
                this.processSubmissionJob(submissionId, questionAttemptId, correlationId);
              },
              500 * (submission.retryCount + 1),
            );
            if (typeof timer.unref === 'function') {
              timer.unref();
            }
            return;
          }

          // Max retries reached; flag as infrastructure error without penalizing candidate (TC-12)
          this.logger.error(
            `[processSubmissionJob] Permanent infrastructure failure for ${submissionId}. Candidate is NOT penalized.`,
          );
          await this.prisma.codingSubmission.update({
            where: { id: submissionId },
            data: {
              submissionStatus: SubmissionStatus.FAILED,
              executionStatus: ExecutionStatus.INTERNAL_EVALUATION_ERROR,
              isInfrastructureError: true,
              errorMessage: runnerResult.errorMessage || 'Infrastructure failure during evaluation',
            },
          });
          return;
        }

        // Weighted Test Case Scoring (FR-CODE-011)
        let awardedMarks = 0;
        const sampleTestResults: TestCaseSampleResultDto[] = [];
        const hiddenTestResults: any[] = [];

        for (const tc of q.testCases) {
          const testRes = runnerResult.testResults.find((r) => r.testCaseId === tc.id);
          const passed = Boolean(testRes?.passed);
          const weightMarks =
            Number(tc.marks) > 0 ? Number(tc.marks) : totalMarks / Math.max(1, q.testCases.length);

          if (passed) {
            awardedMarks += weightMarks;
          }

          if (tc.visibility === 'SAMPLE') {
            // SAMPLE test case: permitted outputs exposed to candidate (FR-CODE-003, TC-10)
            sampleTestResults.push({
              testCaseId: tc.id,
              passed,
              inputData: tc.inputData,
              expectedOutput: tc.expectedOutput,
              actualOutput: testRes?.actualOutput,
              executionTimeMs: testRes?.executionTimeMs,
              memoryKb: testRes?.memoryKb,
              errorMessage: testRes?.errorMessage,
            });
          } else {
            // HIDDEN test case: stored securely on server; NEVER sent to candidate (Rule 2, FR-CODE-004, FR-CODE-009, TC-10)
            hiddenTestResults.push({
              testCaseId: tc.id,
              passed,
              executionTimeMs: testRes?.executionTimeMs,
              memoryKb: testRes?.memoryKb,
              errorMessage: testRes?.errorMessage,
            });
          }
        }

        // Cap awarded marks to question maximum
        awardedMarks = Math.min(totalMarks, Math.max(0, awardedMarks));

        // Determine final execution status
        let finalStatus = runnerResult.status;
        if (runnerResult.status === ExecutionStatus.ACCEPTED && awardedMarks < totalMarks) {
          finalStatus = ExecutionStatus.WRONG_ANSWER;
        }

        await this.prisma.codingSubmission.update({
          where: { id: submissionId },
          data: {
            submissionStatus: SubmissionStatus.COMPLETED,
            executionStatus: finalStatus,
            awardedMarks: new Decimal(awardedMarks),
            totalMarks: new Decimal(totalMarks),
            compilerOutput: runnerResult.compilerOutput,
            executionTimeMs: runnerResult.executionTimeMs,
            memoryUsedKb: runnerResult.memoryUsedKb,
            sampleTestResults: sampleTestResults as any,
            hiddenTestResults: hiddenTestResults as any,
            isInfrastructureError: false,
          },
        });

        // Sync awarded marks to QuestionAttempt
        await this.syncAttemptMarks(questionAttemptId, awardedMarks);
      }
    } catch (err: any) {
      this.logger.error(
        `[processSubmissionJob] Unexpected error evaluating ${submissionId}: ${err.message}`,
      );
      await this.prisma.codingSubmission.update({
        where: { id: submissionId },
        data: {
          submissionStatus: SubmissionStatus.FAILED,
          executionStatus: ExecutionStatus.INTERNAL_EVALUATION_ERROR,
          isInfrastructureError: true,
          errorMessage: err.message,
        },
      });
    }
  }

  /**
   * Syncs maximum awarded marks to QuestionAttempt across all attempts
   */
  private async syncAttemptMarks(
    questionAttemptId: string,
    currentAwardedMarks: number,
  ): Promise<void> {
    const existing = await this.prisma.questionAttempt.findUnique({
      where: { id: questionAttemptId },
    });
    if (!existing) return;

    const previousMarks = existing.awardedMarks ? Number(existing.awardedMarks) : 0;
    const bestMarks = Math.max(previousMarks, currentAwardedMarks);

    await this.prisma.questionAttempt.update({
      where: { id: questionAttemptId },
      data: {
        awardedMarks: new Decimal(bestMarks),
      },
    });
  }

  /**
   * Get submission status with strict candidate response sanitization (FR-CODE-008, FR-CODE-009, TC-10)
   */
  async getSubmissionStatus(
    userId: string,
    sessionId: string,
    submissionId: string,
  ): Promise<CodeSubmissionStatusDto> {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Candidate record not found.');
    }

    const submission = await this.prisma.codingSubmission.findUnique({
      where: { id: submissionId },
      include: {
        questionAttempt: {
          include: {
            session: {
              include: { assignment: true },
            },
          },
        },
      },
    });

    if (
      !submission ||
      submission.questionAttempt.sessionId !== sessionId ||
      submission.questionAttempt.session.assignment.candidateId !== candidate.id
    ) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Submission access denied.');
    }

    // Response Sanitization (FR-CODE-009, TC-10):
    // NEVER expose hiddenTestResults, hidden inputs, expected outputs, or internal system paths
    return {
      submissionId: submission.id,
      questionAttemptId: submission.questionAttemptId,
      submissionStatus: submission.submissionStatus as SubmissionStatus,
      executionStatus: (submission.executionStatus as ExecutionStatus) || null,
      awardedMarks: submission.awardedMarks ? Number(submission.awardedMarks) : null,
      totalMarks: submission.totalMarks ? Number(submission.totalMarks) : null,
      compilerOutput: submission.compilerOutput || null,
      executionTimeMs: submission.executionTimeMs || null,
      memoryUsedKb: submission.memoryUsedKb || null,
      sampleTestResults:
        (submission.sampleTestResults as unknown as TestCaseSampleResultDto[]) || [],
      isInfrastructureError: submission.isInfrastructureError,
      errorMessage: submission.errorMessage || null,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    };
  }

  /**
   * List all candidate submissions for a specific question attempt
   */
  async getAttemptSubmissions(
    userId: string,
    sessionId: string,
    attemptId: string,
  ): Promise<{ submissions: CodeSubmissionStatusDto[]; totalCount: number; maxAllowed: number }> {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!candidate) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Candidate record not found.');
    }

    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: attemptId },
      include: {
        session: { include: { assignment: true } },
        assessmentQuestion: {
          include: { question: true },
        },
        codingSubmissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (
      !attempt ||
      attempt.sessionId !== sessionId ||
      attempt.session.assignment.candidateId !== candidate.id
    ) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Attempt access denied.');
    }

    const maxAllowed =
      attempt.assessmentQuestion.maxSubmissions ??
      attempt.assessmentQuestion.question.maxSubmissions ??
      10;

    const sanitizedSubmissions = attempt.codingSubmissions.map((sub) => ({
      submissionId: sub.id,
      questionAttemptId: sub.questionAttemptId,
      submissionStatus: sub.submissionStatus as SubmissionStatus,
      executionStatus: (sub.executionStatus as ExecutionStatus) || null,
      awardedMarks: sub.awardedMarks ? Number(sub.awardedMarks) : null,
      totalMarks: sub.totalMarks ? Number(sub.totalMarks) : null,
      compilerOutput: sub.compilerOutput || null,
      executionTimeMs: sub.executionTimeMs || null,
      memoryUsedKb: sub.memoryUsedKb || null,
      sampleTestResults: (sub.sampleTestResults as unknown as TestCaseSampleResultDto[]) || [],
      isInfrastructureError: sub.isInfrastructureError,
      errorMessage: sub.errorMessage || null,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    }));

    return {
      submissions: sanitizedSubmissions,
      totalCount: sanitizedSubmissions.length,
      maxAllowed,
    };
  }
}
