import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  AccountStatus,
  AssessmentStatus,
  SessionState,
  AttemptState,
  AssignmentStatus,
  QuestionType,
  StartSessionDto,
  StartSessionResponseDto,
  CandidateQuestionDto,
  CandidateQuestionOptionDto,
  CandidateSampleTestCaseDto,
  SessionStatusDto,
  PaletteItemDto,
  SubmitAnswerDto,
  SubmitAnswerAckDto,
  SaveDraftDto,
  FinalSubmitResponseDto,
  AdminSessionOverrideDto,
  AdminSessionOverrideResponseDto,
  SessionHeartbeatDto,
  SessionHeartbeatResponseDto,
  AuditOutcome,
} from '@verisync/shared';
import { Prisma } from '@prisma/client';
import { EvaluationService } from '../evaluation/evaluation.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  // Approved minimum client version for lab kiosks (FR-LAB-003, TC-16)
  private readonly MIN_APPROVED_VERSION = '1.0.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * Helper to check if a client version is supported (FR-LAB-003, TC-16)
   */
  private isVersionApproved(version?: string): boolean {
    if (!version || typeof version !== 'string') return false;
    // Disallow retired versions (e.g. 0.x.x)
    const parts = version
      .trim()
      .split('.')
      .map((p) => parseInt(p, 10));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
    if (parts[0] < 1) return false; // Retired version (< 1.0.0)
    return true;
  }

  /**
   * Helper to resolve candidate profile from user ID
   */
  private async getCandidateByUserId(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            accountStatus: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new ApiErrorException(
        ApiErrorCode.NOT_ELIGIBLE,
        'No candidate profile associated with current account',
      );
    }

    if (candidate.user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        'Candidate account is inactive or suspended',
      );
    }

    return candidate;
  }

  /**
   * Start Assessment Session (UC-08, FR-UI-002, FR-TIME-002, BR-007, TC-15, TC-16)
   */
  async startSession(
    userId: string,
    assessmentId: string,
    dto: StartSessionDto,
    correlationId: string,
    clientIp: string,
  ): Promise<StartSessionResponseDto> {
    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    // 1. Client version check (FR-LAB-003, TC-16)
    if (!this.isVersionApproved(dto.clientVersion)) {
      throw new ApiErrorException(
        ApiErrorCode.UNSUPPORTED_CLIENT,
        `Client version ${dto.clientVersion || 'unknown'} is not approved. Minimum supported version is ${this.MIN_APPROVED_VERSION}.`,
        { clientVersion: dto.clientVersion, minSupported: this.MIN_APPROVED_VERSION },
      );
    }

    // 2. Lab device verification (FR-LAB-001..004)
    let matchedDeviceId: string | undefined = undefined;
    if (dto.deviceId) {
      const device = await this.prisma.labDevice.findUnique({
        where: { deviceReference: dto.deviceId },
      });
      if (device) {
        if (device.deviceStatus === 'BLOCKED') {
          throw new ApiErrorException(
            ApiErrorCode.FORBIDDEN,
            'This lab device has been blocked by administrators.',
          );
        }
        if (
          device.approvedClientVersion &&
          dto.clientVersion !== device.approvedClientVersion &&
          !this.isVersionApproved(dto.clientVersion)
        ) {
          throw new ApiErrorException(
            ApiErrorCode.UNSUPPORTED_CLIENT,
            `Client version does not match approved version for this lab computer.`,
          );
        }
        matchedDeviceId = device.id;
        // update last seen
        await this.prisma.labDevice.update({
          where: { id: device.id },
          data: { lastSeenAt: now },
        });
      }
    }

    // 3. Instruction acknowledgment check (FR-UI-002)
    if (!dto.acknowledgedInstructions) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Instructions must be explicitly acknowledged before starting the assessment.',
      );
    }

    // 4. Assignment verification
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: {
        assessmentId_candidateId: {
          assessmentId,
          candidateId: candidate.id,
        },
      },
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
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
        sessions: true,
      },
    });

    if (!assignment || assignment.assignmentStatus === AssignmentStatus.REVOKED) {
      throw new ApiErrorException(
        ApiErrorCode.NOT_ELIGIBLE,
        'Candidate is not assigned to this assessment or assignment was revoked.',
      );
    }

    const asmt = assignment.assessment;

    // 5. Assessment window and status check
    const isStatusValid =
      asmt.status === AssessmentStatus.ACTIVE || asmt.status === AssessmentStatus.SCHEDULED;
    if (!isStatusValid) {
      throw new ApiErrorException(
        ApiErrorCode.NOT_ELIGIBLE,
        `Assessment is ${asmt.status.toLowerCase()} and cannot be started.`,
      );
    }

    if (now < asmt.startAt) {
      throw new ApiErrorException(
        ApiErrorCode.NOT_ELIGIBLE,
        'Assessment availability window has not opened yet.',
      );
    }

    if (now > asmt.endAt) {
      throw new ApiErrorException(
        ApiErrorCode.NOT_ELIGIBLE,
        'Assessment availability window has closed.',
      );
    }

    // 6. Single active session per assignment enforcement (BR-007, TC-15)
    const activeSession = assignment.sessions.find(
      (s) =>
        s.sessionStatus === SessionState.ACTIVE ||
        s.sessionStatus === SessionState.INTERRUPTED ||
        s.sessionStatus === SessionState.READY,
    );
    if (activeSession) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'An active assessment session already exists. Multiple simultaneous sessions are denied.',
        { activeSessionId: activeSession.id },
      );
    }

    // 7. Attempt count check (FR-ASMT-006)
    const validSessions = assignment.sessions.filter(
      (s) => s.sessionStatus !== SessionState.CANCELLED,
    );
    if (validSessions.length >= asmt.attemptLimit) {
      throw new ApiErrorException(
        ApiErrorCode.NOT_ELIGIBLE,
        'Maximum attempt limit exhausted for this assessment.',
      );
    }

    // 8. Questions configuration verification
    if (asmt.assessmentQuestions.length === 0) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Assessment has no questions configured.',
      );
    }

    // Prepare questions (handling randomization per session: FR-QB-009, FR-ASMT-002)
    let orderedQuestions = [...asmt.assessmentQuestions];
    if (asmt.randomizeQuestions) {
      orderedQuestions = this.shuffleArray(orderedQuestions);
    }

    // 9. Server-Authoritative Deadlines computation (FR-TIME-001..003, FR-TIME-007)
    const overallDurationMs = asmt.overallDuration * 60 * 1000;
    let overallDeadline = new Date(now.getTime() + overallDurationMs);
    // Overall deadline is capped by assessment window endAt
    if (overallDeadline > asmt.endAt) {
      overallDeadline = asmt.endAt;
    }

    const attemptNumber = validSessions.length + 1;

    // 10. Durable atomic transaction creating session and question attempts (Rule 4)
    const result = await this.prisma.$transaction(async (tx) => {
      // Create AssessmentSession
      const session = await tx.assessmentSession.create({
        data: {
          assignmentId: assignment.id,
          attemptNumber,
          startedAt: now,
          overallDeadline,
          sessionStatus: SessionState.ACTIVE,
          clientVersion: dto.clientVersion,
          deviceId: matchedDeviceId,
          lastHeartbeatAt: now,
        },
      });

      // Update assignment status to STARTED
      await tx.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { assignmentStatus: AssignmentStatus.STARTED },
      });

      // Create QuestionAttempt for each question
      const questionAttempts = [];
      for (let i = 0; i < orderedQuestions.length; i++) {
        const aq = orderedQuestions[i];
        const isFirst = i === 0;

        let deadlineAt: Date | null = null;
        if (isFirst) {
          const limitSeconds = aq.timeLimitSeconds;
          if (limitSeconds && limitSeconds > 0) {
            deadlineAt = new Date(now.getTime() + limitSeconds * 1000);
            if (deadlineAt > overallDeadline) {
              deadlineAt = overallDeadline;
            }
          } else {
            deadlineAt = overallDeadline;
          }
        }

        const qa = await tx.questionAttempt.create({
          data: {
            sessionId: session.id,
            assessmentQuestionId: aq.id,
            attemptStatus: isFirst ? AttemptState.ACTIVE : AttemptState.PENDING,
            startedAt: isFirst ? now : null,
            deadlineAt,
          },
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
          },
        });
        questionAttempts.push(qa);
      }

      return { session, questionAttempts };
    });

    // 11. Write audit log (FR-AUD-002)
    await this.auditService.log({
      actorUserId: userId,
      eventType: 'SESSION_START',
      affectedEntity: `assessment_session:${result.session.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId,
        sessionId: result.session.id,
        attemptNumber,
        clientVersion: dto.clientVersion,
        clientIp,
        startedAt: now.toISOString(),
        overallDeadline: overallDeadline.toISOString(),
      },
    });

    const firstQa = result.questionAttempts[0];
    const sanitizedFirstQuestion = this.sanitizeQuestionAttempt(
      firstQa,
      now,
      asmt.randomizeOptions,
    );

    const palette: PaletteItemDto[] = result.questionAttempts.map((qa, index) => ({
      sequenceNumber: index + 1,
      questionAttemptId: qa.id,
      status: index === 0 ? 'CURRENT' : 'NOT_ANSWERED',
    }));

    const remainingOverallSeconds = Math.max(
      0,
      Math.floor((overallDeadline.getTime() - now.getTime()) / 1000),
    );

    return {
      sessionId: result.session.id,
      assignmentId: assignment.id,
      attemptNumber,
      startedAt: now.toISOString(),
      overallDeadline: overallDeadline.toISOString(),
      overallRemainingSeconds: remainingOverallSeconds,
      currentQuestion: sanitizedFirstQuestion,
      palette,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Get Active Question and Authoritative Deadline (FR-UI-003, FR-TIME-003, TC-08, TC-09)
   */
  async getCurrentQuestion(userId: string, sessionId: string): Promise<CandidateQuestionDto> {
    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: true,
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
          },
          orderBy: {
            assessmentQuestion: { sequenceNumber: 'asc' },
          },
        },
      },
    });

    if (!session) {
      throw new ApiErrorException(ApiErrorCode.NOT_ELIGIBLE, 'Session not found');
    }

    // Ownership check (TC-08)
    if (session.assignment.candidateId !== candidate.id) {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        'Access denied: You do not own this assessment session.',
      );
    }

    // Opportunistic expiry processing
    await this.processSessionExpirations(session.id, now);

    // Reload refreshed session
    const refreshed = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: { assessment: true },
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
          },
          orderBy: {
            assessmentQuestion: { sequenceNumber: 'asc' },
          },
        },
      },
    });

    if (!refreshed || refreshed.sessionStatus !== SessionState.ACTIVE) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Session is ${refreshed?.sessionStatus.toLowerCase() || 'unavailable'}.`,
      );
    }

    const activeAttempt = refreshed.questionAttempts.find(
      (qa) => qa.attemptStatus === AttemptState.ACTIVE,
    );

    if (!activeAttempt) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'No active question found for this session.',
      );
    }

    return this.sanitizeQuestionAttempt(
      activeAttempt,
      now,
      refreshed.assignment.assessment.randomizeOptions,
    );
  }

  /**
   * Authoritative Remaining-Time Synchronization & Session Status (FR-TIME-008, FR-UI-004, TC-07)
   */
  async getSessionStatus(userId: string, sessionId: string): Promise<SessionStatusDto> {
    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: { assessment: true },
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
          },
          orderBy: {
            assessmentQuestion: { sequenceNumber: 'asc' },
          },
        },
      },
    });

    if (!session) {
      throw new ApiErrorException(ApiErrorCode.NOT_ELIGIBLE, 'Session not found');
    }

    // Ownership check (TC-08)
    if (session.assignment.candidateId !== candidate.id) {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        'Access denied: You do not own this assessment session.',
      );
    }

    // Disconnection Recovery (BR-010, TC-07, UC-12):
    // If session was INTERRUPTED, candidate status call resumes it to ACTIVE without pausing deadlines.
    if (session.sessionStatus === SessionState.INTERRUPTED) {
      await this.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: {
          sessionStatus: SessionState.ACTIVE,
          lastHeartbeatAt: now,
        },
      });
      session.sessionStatus = SessionState.ACTIVE;
    }

    // Opportunistic expiry processing
    await this.processSessionExpirations(session.id, now);

    const refreshed = (await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: { assessment: true },
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
          },
          orderBy: {
            assessmentQuestion: { sequenceNumber: 'asc' },
          },
        },
      },
    }))!;

    const overallDeadline = refreshed.overallDeadline || now;
    const overallRemainingSeconds = Math.max(
      0,
      Math.floor((overallDeadline.getTime() - now.getTime()) / 1000),
    );

    const activeAttempt = refreshed.questionAttempts.find(
      (qa) => qa.attemptStatus === AttemptState.ACTIVE,
    );

    const currentQuestion = activeAttempt
      ? this.sanitizeQuestionAttempt(
          activeAttempt,
          now,
          refreshed.assignment.assessment.randomizeOptions,
        )
      : null;

    const palette: PaletteItemDto[] = refreshed.questionAttempts.map((qa, index) => {
      let status: 'ANSWERED' | 'CURRENT' | 'NOT_ANSWERED' = 'NOT_ANSWERED';
      if (qa.attemptStatus === AttemptState.SUBMITTED) {
        status = 'ANSWERED';
      } else if (qa.attemptStatus === AttemptState.ACTIVE) {
        status = 'CURRENT';
      }
      return {
        sequenceNumber: index + 1,
        questionAttemptId: qa.id,
        status,
      };
    });

    return {
      sessionId: refreshed.id,
      sessionStatus: refreshed.sessionStatus as SessionState,
      startedAt: refreshed.startedAt ? refreshed.startedAt.toISOString() : now.toISOString(),
      overallDeadline: overallDeadline.toISOString(),
      overallRemainingSeconds,
      currentQuestion,
      palette,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Session Heartbeat (BR-010, UC-12)
   */
  async sendHeartbeat(
    userId: string,
    sessionId: string,
    dto: SessionHeartbeatDto,
  ): Promise<SessionHeartbeatResponseDto> {
    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { assignment: true },
    });

    if (!session || session.assignment.candidateId !== candidate.id) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Session access denied.');
    }

    let newStatus = session.sessionStatus;
    if (session.sessionStatus === SessionState.INTERRUPTED) {
      newStatus = SessionState.ACTIVE;
    }

    await this.prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        lastHeartbeatAt: now,
        sessionStatus: newStatus,
        deviceId: dto.deviceId || session.deviceId,
      },
    });

    return {
      status: 'ok',
      sessionStatus: newStatus as SessionState,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Submit Answer with Idempotency-Key (FR-ANS-001..009, FR-TIME-001..011, TC-01..05)
   */
  async submitAnswer(
    userId: string,
    sessionId: string,
    idempotencyKey: string,
    dto: SubmitAnswerDto,
    correlationId: string,
    clientIp: string,
  ): Promise<SubmitAnswerAckDto> {
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Idempotency-Key header is required for answer submissions.',
      );
    }

    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    // 1. Fetch session and question attempts
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: { assessment: true },
        },
        questionAttempts: {
          include: {
            assessmentQuestion: true,
            answers: true,
          },
          orderBy: {
            assessmentQuestion: { sequenceNumber: 'asc' },
          },
        },
      },
    });

    if (!session) {
      throw new ApiErrorException(ApiErrorCode.NOT_ELIGIBLE, 'Session not found.');
    }

    if (session.assignment.candidateId !== candidate.id) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Access denied to session.');
    }

    // 2. Idempotency Check (FR-ANS-009, TC-04, TC-05):
    // Check if an answer with this idempotencyKey has already been stored for this attempt
    const targetAttempt = session.questionAttempts.find((qa) => qa.id === dto.questionAttemptId);

    if (!targetAttempt) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Question attempt does not belong to this session.',
      );
    }

    const existingAnswer = targetAttempt.answers.find((a) => a.idempotencyKey === idempotencyKey);

    if (existingAnswer) {
      this.logger.log(
        `[submitAnswer] Idempotency hit: attempt ${targetAttempt.id}, key ${idempotencyKey}`,
      );
      // Find the next question attempt that was activated
      const nextAttempt = session.questionAttempts.find(
        (qa) =>
          qa.assessmentQuestion.sequenceNumber > targetAttempt.assessmentQuestion.sequenceNumber,
      );

      return {
        status: 'accepted',
        questionAttemptId: targetAttempt.id,
        submittedAt: existingAnswer.submittedAt.toISOString(),
        next: nextAttempt
          ? {
              questionAttemptId: nextAttempt.id,
              sequenceNumber: nextAttempt.assessmentQuestion.sequenceNumber,
              deadlineAt: nextAttempt.deadlineAt
                ? nextAttempt.deadlineAt.toISOString()
                : session.overallDeadline!.toISOString(),
            }
          : null,
        serverTime: now.toISOString(),
      };
    }

    // 3. Process opportunistic expirations before evaluating status
    await this.processSessionExpirations(session.id, now);

    // Reload refreshed attempt and session
    const refreshedAttempt = await this.prisma.questionAttempt.findUnique({
      where: { id: dto.questionAttemptId },
      include: {
        session: true,
        assessmentQuestion: true,
      },
    });

    if (!refreshedAttempt) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, 'Question attempt not found.');
    }

    const currentSession = refreshedAttempt.session;

    if (currentSession.sessionStatus !== SessionState.ACTIVE) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Session is ${currentSession.sessionStatus.toLowerCase()}.`,
      );
    }

    // 4. Sequential progression enforcement (FR-ANS-001, BR-003, TC-02)
    if (refreshedAttempt.attemptStatus === AttemptState.PENDING) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Cannot submit answer for a future or pending question. Strict sequential progression required.',
        { attemptStatus: refreshedAttempt.attemptStatus },
      );
    }

    if (refreshedAttempt.attemptStatus === AttemptState.SUBMITTED) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Answer has already been submitted and finalized for this question.',
      );
    }

    if (refreshedAttempt.attemptStatus === AttemptState.TIMED_OUT) {
      throw new ApiErrorException(ApiErrorCode.QUESTION_EXPIRED, 'This question has timed out.');
    }

    // 5. Server-Authoritative Deadline Check (FR-TIME-001, FR-TIME-004, TC-01, TC-03, TC-06)
    const isOverallExpired = currentSession.overallDeadline && now > currentSession.overallDeadline;
    const isQuestionExpired = refreshedAttempt.deadlineAt && now > refreshedAttempt.deadlineAt;

    if (isOverallExpired || isQuestionExpired) {
      // Finalize question as TIMED_OUT
      await this.prisma.$transaction(async (tx) => {
        await tx.questionAttempt.update({
          where: { id: refreshedAttempt.id },
          data: {
            attemptStatus: AttemptState.TIMED_OUT,
            submittedAt: now,
          },
        });

        if (isOverallExpired) {
          await tx.assessmentSession.update({
            where: { id: currentSession.id },
            data: {
              sessionStatus: SessionState.EXPIRED,
              submittedAt: now,
            },
          });
          await tx.assessmentAssignment.update({
            where: { id: currentSession.assignmentId },
            data: { assignmentStatus: AssignmentStatus.COMPLETED },
          });
        } else {
          // Auto-advance to next question if overall deadline not expired
          await this.advanceToNextQuestion(tx, currentSession, refreshedAttempt, now);
        }
      });

      throw new ApiErrorException(
        ApiErrorCode.QUESTION_EXPIRED,
        isOverallExpired
          ? 'Assessment overall deadline has passed.'
          : 'This question has timed out.',
      );
    }

    // 6. Answer payload validation
    if (!dto.answer || typeof dto.answer !== 'object') {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Answer payload must be an object.',
      );
    }

    // 7. Durable database transaction committing the answer and activating next question (Rule 4, NFR-REL-002)
    const txResult = await this.prisma.$transaction(async (tx) => {
      // Store answer with unique idempotencyKey
      const answer = await tx.answer.create({
        data: {
          questionAttemptId: refreshedAttempt.id,
          answerPayload: dto.answer as Prisma.InputJsonValue,
          idempotencyKey,
          submittedAt: now,
        },
      });

      // Mark current attempt as SUBMITTED
      await tx.questionAttempt.update({
        where: { id: refreshedAttempt.id },
        data: {
          attemptStatus: AttemptState.SUBMITTED,
          submittedAt: now,
        },
      });

      // Auto-advance to next question (FR-TIME-005)
      const nextAttempt = await this.advanceToNextQuestion(
        tx,
        currentSession,
        refreshedAttempt,
        now,
      );

      return { answer, nextAttempt };
    });

    // 8. Log audit event (FR-AUD-002)
    await this.auditService.log({
      actorUserId: userId,
      eventType: 'QUESTION_SUBMIT',
      affectedEntity: `question_attempt:${refreshedAttempt.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        sessionId: currentSession.id,
        questionAttemptId: refreshedAttempt.id,
        idempotencyKey,
        submittedAt: now.toISOString(),
        clientIp,
      },
    });

    return {
      status: 'accepted',
      questionAttemptId: refreshedAttempt.id,
      submittedAt: txResult.answer.submittedAt.toISOString(),
      next: txResult.nextAttempt
        ? {
            questionAttemptId: txResult.nextAttempt.id,
            sequenceNumber: txResult.nextAttempt.assessmentQuestion?.sequenceNumber ?? 0,
            deadlineAt: txResult.nextAttempt.deadlineAt
              ? txResult.nextAttempt.deadlineAt.toISOString()
              : (currentSession.overallDeadline?.toISOString() ?? now.toISOString()),
          }
        : null,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Autosave Draft without Extending Deadline or Submitting (FR-ANS-005)
   */
  async saveDraft(
    userId: string,
    sessionId: string,
    dto: SaveDraftDto,
  ): Promise<{ status: string; questionAttemptId: string; serverTime: string }> {
    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: dto.questionAttemptId },
      include: { session: { include: { assignment: true } } },
    });

    if (
      !attempt ||
      attempt.sessionId !== sessionId ||
      attempt.session.assignment.candidateId !== candidate.id
    ) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Access denied.');
    }

    if (attempt.attemptStatus !== AttemptState.ACTIVE) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Cannot save draft for an inactive question.',
      );
    }

    await this.prisma.questionAttempt.update({
      where: { id: attempt.id },
      data: {
        draftPayload: dto.draftPayload as Prisma.InputJsonValue,
      },
    });

    return {
      status: 'saved',
      questionAttemptId: attempt.id,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Final Assessment Submission (FR-ANS-008, UC-13, Decision 4)
   */
  async finalSubmit(
    userId: string,
    sessionId: string,
    correlationId: string,
    clientIp: string,
  ): Promise<FinalSubmitResponseDto> {
    const candidate = await this.getCandidateByUserId(userId);
    const now = new Date();

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: {
            assessment: true,
          },
        },
        questionAttempts: true,
      },
    });

    if (!session || session.assignment.candidateId !== candidate.id) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Session access denied.');
    }

    if (
      session.sessionStatus !== SessionState.ACTIVE &&
      session.sessionStatus !== SessionState.INTERRUPTED
    ) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Assessment is already ${session.sessionStatus.toLowerCase()}.`,
      );
    }

    // In a transaction, mark active question attempt submitted/timed out, mark session SUBMITTED, assignment COMPLETED
    await this.prisma.$transaction(async (tx) => {
      for (const qa of session.questionAttempts) {
        if (qa.attemptStatus === AttemptState.ACTIVE) {
          await tx.questionAttempt.update({
            where: { id: qa.id },
            data: {
              attemptStatus: AttemptState.SUBMITTED,
              submittedAt: now,
            },
          });
        } else if (qa.attemptStatus === AttemptState.PENDING) {
          await tx.questionAttempt.update({
            where: { id: qa.id },
            data: {
              attemptStatus: AttemptState.SKIPPED,
              submittedAt: now,
            },
          });
        }
      }

      await tx.assessmentSession.update({
        where: { id: session.id },
        data: {
          sessionStatus: SessionState.SUBMITTED,
          submittedAt: now,
        },
      });

      await tx.assessmentAssignment.update({
        where: { id: session.assignmentId },
        data: {
          assignmentStatus: AssignmentStatus.COMPLETED,
        },
      });
    });

    // Write audit event (FR-AUD-002)
    await this.auditService.log({
      actorUserId: userId,
      eventType: 'SESSION_SUBMIT',
      affectedEntity: `assessment_session:${session.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        sessionId: session.id,
        assessmentId: session.assignment.assessmentId,
        submittedAt: now.toISOString(),
        clientIp,
      },
    });

    // Evaluate session against snapshot and configuration (FR-SCORE-001..008, UC-14)
    await this.evaluationService.evaluateSession(session.id);

    const answeredCount = session.questionAttempts.filter(
      (qa) => qa.attemptStatus === AttemptState.SUBMITTED,
    ).length;

    return {
      status: 'submitted',
      sessionId: session.id,
      candidateIdentifier: candidate.candidateIdentifier,
      assessmentTitle: session.assignment.assessment.title,
      totalQuestions: session.questionAttempts.length,
      answeredCount,
      submittedAt: now.toISOString(),
      serverTime: now.toISOString(),
    };
  }

  /**
   * Admin Session Overrides (BR-012, UC-12, FR-TIME-011)
   */
  async adminOverride(
    adminUserId: string,
    sessionId: string,
    dto: AdminSessionOverrideDto,
    correlationId: string,
    clientIp: string,
  ): Promise<AdminSessionOverrideResponseDto> {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'A mandatory non-empty reason is required for administrative session overrides (BR-012).',
      );
    }

    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        questionAttempts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new ApiErrorException(ApiErrorCode.NOT_ELIGIBLE, 'Session not found.');
    }

    const previousStatus = session.sessionStatus;
    let newStatus = session.sessionStatus;
    let newOverallDeadline = session.overallDeadline || new Date();
    const now = new Date();

    if (dto.action === 'EXTEND') {
      if (!dto.extensionMinutes || dto.extensionMinutes <= 0) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          'Extension minutes must be greater than 0.',
        );
      }
      const extensionMs = dto.extensionMinutes * 60 * 1000;
      newOverallDeadline = new Date(newOverallDeadline.getTime() + extensionMs);

      await this.prisma.$transaction(async (tx) => {
        await tx.assessmentSession.update({
          where: { id: sessionId },
          data: { overallDeadline: newOverallDeadline },
        });

        // Also extend the currently active question attempt deadline
        const activeAttempt = session.questionAttempts.find(
          (qa) => qa.attemptStatus === AttemptState.ACTIVE,
        );
        if (activeAttempt && activeAttempt.deadlineAt) {
          const newAttemptDeadline = new Date(activeAttempt.deadlineAt.getTime() + extensionMs);
          await tx.questionAttempt.update({
            where: { id: activeAttempt.id },
            data: { deadlineAt: newAttemptDeadline },
          });
        }
      });
    } else if (dto.action === 'REOPEN') {
      newStatus = SessionState.ACTIVE;
      const extensionMinutes =
        dto.extensionMinutes && dto.extensionMinutes > 0 ? dto.extensionMinutes : 15;
      newOverallDeadline = new Date(now.getTime() + extensionMinutes * 60 * 1000);

      await this.prisma.$transaction(async (tx) => {
        await tx.assessmentSession.update({
          where: { id: sessionId },
          data: {
            sessionStatus: SessionState.ACTIVE,
            overallDeadline: newOverallDeadline,
          },
        });

        // Re-activate last question attempt or first pending
        const lastAttempt = session.questionAttempts[session.questionAttempts.length - 1];
        if (lastAttempt) {
          await tx.questionAttempt.update({
            where: { id: lastAttempt.id },
            data: {
              attemptStatus: AttemptState.ACTIVE,
              deadlineAt: newOverallDeadline,
            },
          });
        }
      });
    } else if (dto.action === 'PAUSE') {
      newStatus = SessionState.INTERRUPTED;
      await this.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { sessionStatus: SessionState.INTERRUPTED },
      });
    } else if (dto.action === 'RESUME') {
      newStatus = SessionState.ACTIVE;
      await this.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: {
          sessionStatus: SessionState.ACTIVE,
          lastHeartbeatAt: now,
        },
      });
    } else if (dto.action === 'CANCEL') {
      newStatus = SessionState.CANCELLED;
      await this.prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { sessionStatus: SessionState.CANCELLED },
      });
    }

    // Write audit log (BR-012, FR-AUD-001)
    await this.auditService.log({
      actorUserId: adminUserId,
      eventType: 'ADMIN_SESSION_OVERRIDE',
      affectedEntity: `assessment_session:${sessionId}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        sessionId,
        action: dto.action,
        reason: dto.reason,
        extensionMinutes: dto.extensionMinutes,
        previousStatus,
        newStatus,
        newOverallDeadline: newOverallDeadline.toISOString(),
        clientIp,
      },
    });

    return {
      sessionId,
      previousStatus: previousStatus as SessionState,
      newStatus: newStatus as SessionState,
      overallDeadline: newOverallDeadline.toISOString(),
      overrideReason: dto.reason,
      performedBy: adminUserId,
      serverTime: now.toISOString(),
    };
  }

  /**
   * Opportunistic & Worker Expiration Engine (FR-TIME-004..007, TC-06)
   */
  async processSessionExpirations(sessionId: string, now: Date) {
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        questionAttempts: {
          include: { assessmentQuestion: true },
          orderBy: { assessmentQuestion: { sequenceNumber: 'asc' } },
        },
      },
    });

    if (!session) return;
    if (
      session.sessionStatus !== SessionState.ACTIVE &&
      session.sessionStatus !== SessionState.INTERRUPTED
    ) {
      return;
    }

    // 1. Overall deadline check (FR-TIME-006, FR-TIME-007, TC-06: overall deadline takes precedence)
    if (session.overallDeadline && now >= session.overallDeadline) {
      await this.prisma.$transaction(async (tx) => {
        // Finalize any active question attempt as TIMED_OUT
        for (const qa of session.questionAttempts) {
          if (qa.attemptStatus === AttemptState.ACTIVE) {
            await tx.questionAttempt.update({
              where: { id: qa.id },
              data: {
                attemptStatus: AttemptState.TIMED_OUT,
                submittedAt: now,
              },
            });
          }
        }

        // Finalize session as EXPIRED
        await tx.assessmentSession.update({
          where: { id: session.id },
          data: {
            sessionStatus: SessionState.EXPIRED,
            submittedAt: now,
          },
        });

        // Finalize assignment as COMPLETED
        await tx.assessmentAssignment.update({
          where: { id: session.assignmentId },
          data: { assignmentStatus: AssignmentStatus.COMPLETED },
        });
      });

      // Evaluate expired session (FR-SCORE-006, FR-SCORE-008)
      await this.evaluationService.evaluateSession(session.id);
      return;
    }

    // 2. Question attempt deadline check & auto-advance (FR-TIME-004, FR-TIME-005)
    const activeAttempt = session.questionAttempts.find(
      (qa) => qa.attemptStatus === AttemptState.ACTIVE,
    );

    if (activeAttempt && activeAttempt.deadlineAt && now >= activeAttempt.deadlineAt) {
      await this.prisma.$transaction(async (tx) => {
        // Mark active attempt as TIMED_OUT
        await tx.questionAttempt.update({
          where: { id: activeAttempt.id },
          data: {
            attemptStatus: AttemptState.TIMED_OUT,
            submittedAt: now,
          },
        });

        // Auto-advance to next question
        await this.advanceToNextQuestion(tx, session, activeAttempt, now);
      });
    }
  }

  /**
   * Auto-advance to the next pending question in sequence (FR-TIME-005)
   */
  private async advanceToNextQuestion(
    tx: Prisma.TransactionClient,
    session: { id: string; overallDeadline: Date | null },
    currentAttempt: { assessmentQuestion: { sequenceNumber: number } },
    now: Date,
  ) {
    const nextAttempt = await tx.questionAttempt.findFirst({
      where: {
        sessionId: session.id,
        attemptStatus: AttemptState.PENDING,
        assessmentQuestion: {
          sequenceNumber: {
            gt: currentAttempt.assessmentQuestion.sequenceNumber,
          },
        },
      },
      include: {
        assessmentQuestion: true,
      },
      orderBy: {
        assessmentQuestion: { sequenceNumber: 'asc' },
      },
    });

    if (nextAttempt) {
      let nextDeadline = session.overallDeadline;
      const limitSeconds = nextAttempt.assessmentQuestion.timeLimitSeconds;
      if (limitSeconds && limitSeconds > 0) {
        const computedDeadline = new Date(now.getTime() + limitSeconds * 1000);
        if (!nextDeadline || computedDeadline < nextDeadline) {
          nextDeadline = computedDeadline;
        }
      }

      const updated = await tx.questionAttempt.update({
        where: { id: nextAttempt.id },
        data: {
          attemptStatus: AttemptState.ACTIVE,
          startedAt: now,
          deadlineAt: nextDeadline,
        },
        include: {
          assessmentQuestion: true,
        },
      });

      return {
        ...nextAttempt,
        ...updated,
        assessmentQuestion: updated?.assessmentQuestion || nextAttempt.assessmentQuestion,
      };
    }

    return null;
  }

  /**
   * Sanitizes question attempt for candidate: zero answer keys, options isCorrect, or hidden test cases (TC-09, Rule 2)
   */
  private sanitizeQuestionAttempt(
    qa: any,
    now: Date,
    randomizeOptions: boolean,
  ): CandidateQuestionDto {
    const q = qa.assessmentQuestion.question;
    const deadline = qa.deadlineAt || new Date(now.getTime() + 60000);
    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    let options: CandidateQuestionOptionDto[] | undefined = undefined;
    if (q.options && q.options.length > 0) {
      let rawOptions = q.options.map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText,
        displayOrder: opt.displayOrder,
      }));

      if (randomizeOptions) {
        rawOptions = this.shuffleArray(rawOptions);
      }

      options = rawOptions;
    }

    // Filter ONLY sample test cases; hidden test cases are NEVER exposed (FR-CODE-004, TC-10)
    let sampleTestCases: CandidateSampleTestCaseDto[] | undefined = undefined;
    if (q.testCases && q.testCases.length > 0) {
      sampleTestCases = q.testCases
        .filter((tc: any) => tc.visibility === 'SAMPLE')
        .map((tc: any) => ({
          id: tc.id,
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
        }));
    }

    return {
      questionAttemptId: qa.id,
      questionId: q.id,
      sequenceNumber: qa.assessmentQuestion.sequenceNumber,
      questionType: q.questionType as QuestionType,
      questionText: q.questionText,
      codeSnippet: q.codeSnippet,
      maximumMarks: Number(qa.assessmentQuestion.marksOverride ?? q.maximumMarks),
      timeLimitSeconds: qa.assessmentQuestion.timeLimitSeconds,
      startedAt: qa.startedAt ? qa.startedAt.toISOString() : null,
      deadlineAt: deadline.toISOString(),
      remainingSeconds,
      options,
      sampleTestCases,
      draftPayload: qa.draftPayload,
    };
  }

  /**
   * Fisher-Yates array shuffle for randomization
   */
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
