import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ApiErrorCode,
  AttemptState,
  AuditOutcome,
  QuestionType,
  ResultStatus,
  ResultVisibility,
  AssessmentResultDto,
  DetailedResultResponseDto,
  QuestionStatisticsDto,
  AssessmentStatisticsDto,
  CandidateResultViewDto,
} from '@verisync/shared';
import { ApiErrorException } from '../common/api-error.exception';
import { Prisma } from '@prisma/client';
import { ResultQueryFilterDto } from './dto/result.dto';

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List assessment results with multi-attribute filtering and pagination (FR-ADMIN-003).
   */
  async listResults(filters: ResultQueryFilterDto) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ResultWhereInput = {};

    if (filters.resultStatus) {
      where.resultStatus = filters.resultStatus;
    }

    if (filters.status && filters.status !== 'ALL') {
      where.passed = filters.status === 'PASS';
    }

    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      where.totalScore = {};
      if (filters.minScore !== undefined) {
        where.totalScore.gte = new Prisma.Decimal(filters.minScore);
      }
      if (filters.maxScore !== undefined) {
        where.totalScore.lte = new Prisma.Decimal(filters.maxScore);
      }
    }

    const sessionWhere: Prisma.AssessmentSessionWhereInput = {};
    const assignmentWhere: Prisma.AssessmentAssignmentWhereInput = {};
    const candidateWhere: Prisma.CandidateProfileWhereInput = {};

    if (filters.assessmentId) {
      assignmentWhere.assessmentId = filters.assessmentId;
    }

    if (filters.candidateIdentifier) {
      candidateWhere.candidateIdentifier = {
        contains: filters.candidateIdentifier,
      };
    }

    if (filters.institution) {
      candidateWhere.institution = {
        contains: filters.institution,
      };
    }

    if (Object.keys(candidateWhere).length > 0) {
      assignmentWhere.candidate = candidateWhere;
    }

    if (Object.keys(assignmentWhere).length > 0) {
      sessionWhere.assignment = assignmentWhere;
    }

    if (Object.keys(sessionWhere).length > 0) {
      where.session = sessionWhere;
    }

    const [total, results] = await Promise.all([
      this.prisma.result.count({ where }),
      this.prisma.result.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ rank: 'asc' }, { totalScore: 'desc' }],
        include: {
          session: {
            include: {
              assignment: {
                include: {
                  candidate: true,
                  assessment: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted: AssessmentResultDto[] = results.map((r) => {
      const candidate = r.session.assignment.candidate;
      const assessment = r.session.assignment.assessment;

      return {
        id: r.id,
        sessionId: r.sessionId,
        assignmentId: r.session.assignmentId,
        candidateIdentifier: candidate.candidateIdentifier,
        candidateName: candidate.fullName,
        institution: candidate.institution,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        totalScore: Number(r.totalScore),
        maximumScore: Number(r.maximumScore),
        percentage: r.percentage !== null ? Number(r.percentage) : 0,
        resultStatus: r.resultStatus as ResultStatus,
        passed: r.passed,
        rank: r.rank,
        submittedAt: r.session.submittedAt
          ? r.session.submittedAt.toISOString()
          : r.createdAt.toISOString(),
        finalizedAt: r.finalizedAt ? r.finalizedAt.toISOString() : null,
      };
    });

    return {
      results: formatted,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get detailed per-question candidate result breakdown and audit history (FR-ADMIN-005).
   */
  async getResultDetails(resultId: string): Promise<DetailedResultResponseDto> {
    const result = await this.prisma.result.findUnique({
      where: { id: resultId },
      include: {
        session: {
          include: {
            assignment: {
              include: {
                candidate: true,
                assessment: true,
              },
            },
            questionAttempts: {
              orderBy: {
                assessmentQuestion: {
                  sequenceNumber: 'asc',
                },
              },
              include: {
                assessmentQuestion: {
                  include: { question: true },
                },
                answers: {
                  orderBy: { submittedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        scoreCorrections: {
          orderBy: { correctedAt: 'desc' },
        },
      },
    });

    if (!result) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Result '${resultId}' not found.`,
      );
    }

    const candidate = result.session.assignment.candidate;
    const assessment = result.session.assignment.assessment;

    const resultDto: AssessmentResultDto = {
      id: result.id,
      sessionId: result.sessionId,
      assignmentId: result.session.assignmentId,
      candidateIdentifier: candidate.candidateIdentifier,
      candidateName: candidate.fullName,
      institution: candidate.institution,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      totalScore: Number(result.totalScore),
      maximumScore: Number(result.maximumScore),
      percentage: result.percentage !== null ? Number(result.percentage) : 0,
      resultStatus: result.resultStatus as ResultStatus,
      passed: result.passed,
      rank: result.rank,
      submittedAt: result.session.submittedAt
        ? result.session.submittedAt.toISOString()
        : result.createdAt.toISOString(),
      finalizedAt: result.finalizedAt ? result.finalizedAt.toISOString() : null,
    };

    const breakdown = result.session.questionAttempts.map((qa) => {
      const q = qa.assessmentQuestion.question;
      const latestAns = qa.answers[0];
      const maxMarks =
        qa.assessmentQuestion.marksOverride !== null
          ? Number(qa.assessmentQuestion.marksOverride)
          : Number(q.maximumMarks);

      return {
        questionAttemptId: qa.id,
        questionId: q.id,
        sequenceNumber: qa.assessmentQuestion.sequenceNumber,
        questionType: q.questionType as QuestionType,
        questionText: q.questionText,
        maximumMarks: maxMarks,
        negativeMarks: Number(q.negativeMarks),
        marksAwarded: qa.awardedMarks !== null ? Number(qa.awardedMarks) : 0,
        candidateResponse: latestAns ? latestAns.answerPayload : null,
        attemptStatus: qa.attemptStatus as unknown as AttemptState,
        evaluatorFeedback: qa.evaluatorFeedback,
        evaluatedBy: qa.evaluatedBy,
        evaluatedAt: qa.evaluatedAt ? qa.evaluatedAt.toISOString() : null,
      };
    });

    const corrections = result.scoreCorrections.map((sc) => ({
      id: sc.id,
      resultId: sc.resultId,
      questionAttemptId: sc.questionAttemptId,
      originalValue: Number(sc.originalValue),
      revisedValue: Number(sc.revisedValue),
      reason: sc.reason,
      correctedBy: sc.correctedBy,
      correctedAt: sc.correctedAt.toISOString(),
    }));

    return {
      result: resultDto,
      breakdown,
      corrections,
    };
  }

  /**
   * Question-level and assessment-level performance statistics (FR-ADMIN-006, FR-ADMIN-009).
   */
  async getAssessmentStatistics(assessmentId: string): Promise<AssessmentStatisticsDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentQuestions: {
          orderBy: { sequenceNumber: 'asc' },
          include: { question: true },
        },
        assignments: {
          include: {
            sessions: {
              include: {
                result: true,
                questionAttempts: {
                  include: { answers: true },
                },
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Assessment '${assessmentId}' not found.`,
      );
    }

    const totalCandidates = assessment.assignments.length;
    const completedSessions = assessment.assignments.flatMap((a) =>
      a.sessions.filter((s) => s.result !== null),
    );

    const scores = completedSessions.map((s) => Number(s.result!.totalScore));
    const averageScore =
      scores.length > 0 ? scores.reduce((sum, val) => sum + val, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const passedCount = completedSessions.filter((s) => s.result!.passed === true).length;
    const passingPercentage =
      completedSessions.length > 0 ? (passedCount / completedSessions.length) * 100 : 0;

    // Sort completed sessions by total score for discrimination index calculation
    completedSessions.sort((a, b) => Number(b.result!.totalScore) - Number(a.result!.totalScore));

    const upperCohortCount = Math.max(1, Math.floor(completedSessions.length * 0.27));
    const lowerCohortCount = upperCohortCount;
    const upperCohort = completedSessions.slice(0, upperCohortCount);
    const lowerCohort = completedSessions.slice(completedSessions.length - lowerCohortCount);

    // Compute question-level statistics (FR-ADMIN-006)
    const questionStats: QuestionStatisticsDto[] = assessment.assessmentQuestions.map((aq) => {
      const q = aq.question;
      const maxMarks =
        aq.marksOverride !== null ? Number(aq.marksOverride) : Number(q.maximumMarks);

      let totalAttempts = 0;
      let correctAttempts = 0;
      let incorrectAttempts = 0;
      let unansweredAttempts = 0;
      let totalAwarded = 0;

      for (const session of completedSessions) {
        const attempt = session.questionAttempts.find((qa) => qa.assessmentQuestionId === aq.id);
        if (!attempt) {
          unansweredAttempts++;
          continue;
        }

        totalAttempts++;
        const marks = attempt.awardedMarks !== null ? Number(attempt.awardedMarks) : 0;
        totalAwarded += marks;

        if (marks >= maxMarks) {
          correctAttempts++;
        } else if (marks <= 0 && attempt.answers.length > 0) {
          incorrectAttempts++;
        } else if (attempt.answers.length === 0) {
          unansweredAttempts++;
        } else {
          // Partial credit treated as correct proportional or partial
          correctAttempts++;
        }
      }

      const avgScore = totalAttempts > 0 ? totalAwarded / totalAttempts : 0;
      const difficultyIndex = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

      // Discrimination index: difference between upper 27% and lower 27% success rate
      let discriminationIndex = 0;
      if (upperCohort.length > 0 && lowerCohort.length > 0 && completedSessions.length >= 2) {
        const upperCorrect = upperCohort.filter((s) => {
          const att = s.questionAttempts.find((qa) => qa.assessmentQuestionId === aq.id);
          return att && Number(att.awardedMarks) >= maxMarks;
        }).length;

        const lowerCorrect = lowerCohort.filter((s) => {
          const att = s.questionAttempts.find((qa) => qa.assessmentQuestionId === aq.id);
          return att && Number(att.awardedMarks) >= maxMarks;
        }).length;

        discriminationIndex = upperCorrect / upperCohort.length - lowerCorrect / lowerCohort.length;
      }

      return {
        questionId: q.id,
        sequenceNumber: aq.sequenceNumber,
        questionType: q.questionType as QuestionType,
        questionText: q.questionText,
        maximumMarks: maxMarks,
        totalAttempts,
        correctAttempts,
        incorrectAttempts,
        unansweredAttempts,
        averageScore: Number(avgScore.toFixed(2)),
        difficultyIndex: Number(difficultyIndex.toFixed(2)),
        discriminationIndex: Number(discriminationIndex.toFixed(2)),
      };
    });

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      totalCandidates,
      completedSessions: completedSessions.length,
      averageScore: Number(averageScore.toFixed(2)),
      highestScore: Number(highestScore.toFixed(2)),
      lowestScore: Number(lowestScore.toFixed(2)),
      passingPercentage: Number(passingPercentage.toFixed(2)),
      questions: questionStats,
    };
  }

  /**
   * Export authorized assessment results to CSV format (FR-ADMIN-004, FR-ADMIN-008).
   */
  async exportResultsCsv(
    assessmentId: string,
    actorUserId: string,
    correlationId: string,
    clientIp: string,
  ): Promise<string> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assignments: {
          include: {
            candidate: true,
            sessions: {
              include: { result: true },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Assessment '${assessmentId}' not found.`,
      );
    }

    const rows: string[] = [
      'Rank,Candidate ID,Candidate Name,Email,Institution,Assessment Title,Total Score,Maximum Score,Percentage,Passed,Result Status,Submitted At',
    ];

    const resultsList = assessment.assignments
      .flatMap((a) => {
        const candidate = a.candidate;
        return a.sessions
          .filter((s) => s.result !== null)
          .map((s) => ({
            candidate,
            session: s,
            result: s.result!,
          }));
      })
      .sort((a, b) => (a.result.rank ?? 999999) - (b.result.rank ?? 999999));

    for (const item of resultsList) {
      const escape = (str: string | number | null | undefined) =>
        `"${String(str ?? '').replace(/"/g, '""')}"`;

      rows.push(
        [
          escape(item.result.rank ?? 'N/A'),
          escape(item.candidate.candidateIdentifier),
          escape(item.candidate.fullName),
          escape(item.candidate.email),
          escape(item.candidate.institution),
          escape(assessment.title),
          escape(Number(item.result.totalScore)),
          escape(Number(item.result.maximumScore)),
          escape(item.result.percentage !== null ? `${item.result.percentage}%` : 'N/A'),
          escape(
            item.result.passed === true ? 'Pass' : item.result.passed === false ? 'Fail' : 'N/A',
          ),
          escape(item.result.resultStatus),
          escape(item.session.submittedAt ? item.session.submittedAt.toISOString() : ''),
        ].join(','),
      );
    }

    // Mandatory audit logging for candidate data export (FR-ADMIN-008, FR-AUD-001)
    await this.auditService.log({
      actorUserId,
      eventType: 'EXPORT_RESULTS',
      affectedEntity: `assessment:${assessmentId}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId,
        rowCount: resultsList.length,
        clientIp,
      },
    });

    return rows.join('\r\n');
  }

  /**
   * Candidate result view according to assessment resultVisibility policy (FR-ADMIN-007, BR-009, TC-09).
   */
  async getCandidateResult(
    candidateUserId: string,
    assessmentId: string,
  ): Promise<CandidateResultViewDto> {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
    });

    if (!candidate) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Candidate record not found.');
    }

    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: {
        assessmentId_candidateId: {
          assessmentId,
          candidateId: candidate.id,
        },
      },
      include: {
        assessment: true,
        sessions: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
          include: { result: true },
        },
      },
    });

    if (!assignment) {
      throw new ApiErrorException(ApiErrorCode.FORBIDDEN, 'Assessment not assigned to candidate.');
    }

    const assessment = assignment.assessment;
    const latestSession = assignment.sessions[0];

    if (!latestSession || !latestSession.result) {
      return {
        assessmentTitle: assessment.title,
        resultStatus: ResultStatus.PROVISIONAL,
        canViewScore: false,
        visibilityNotice: 'Assessment session has not been submitted or evaluated yet.',
      };
    }

    const result = latestSession.result;
    const now = new Date();

    // Check ResultVisibility policy (FR-ADMIN-007)
    let canViewScore = false;
    let visibilityNotice: string | undefined;

    switch (assessment.resultVisibility) {
      case ResultVisibility.IMMEDIATE:
        canViewScore = true;
        break;

      case ResultVisibility.SCHEDULED:
        if (now >= assessment.endAt) {
          canViewScore = true;
        } else {
          canViewScore = false;
          visibilityNotice = `Results will be published after the assessment window closes at ${assessment.endAt.toISOString()}.`;
        }
        break;

      case ResultVisibility.ADMIN_RELEASE:
      default:
        // Only visible if finalized and marked released (or completed status)
        if (result.resultStatus === ResultStatus.FINAL && assessment.status === 'COMPLETED') {
          canViewScore = true;
        } else {
          canViewScore = false;
          visibilityNotice = 'Results will be published upon administrator release.';
        }
        break;
    }

    return {
      assessmentTitle: assessment.title,
      resultStatus: result.resultStatus as ResultStatus,
      canViewScore,
      visibilityNotice,
      totalScore: canViewScore ? Number(result.totalScore) : undefined,
      maximumScore: canViewScore ? Number(result.maximumScore) : undefined,
      percentage:
        canViewScore && result.percentage !== null ? Number(result.percentage) : undefined,
      passed: canViewScore ? result.passed : undefined,
      rank: canViewScore ? result.rank : undefined,
    };
  }
}
