import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  AccountStatus,
  AssessmentStatus,
  CandidateAssignedAssessmentDto,
  NavigationMode,
} from '@verisync/shared';

@Injectable()
export class CandidatePortalService {
  private readonly logger = new Logger(CandidatePortalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authoritative candidate assigned assessments list with eligibility, status, and attempt tracking (FR-UI-001, UC-08).
   * Absolute Security Guarantee: Zero answer keys, correct answer flags, or hidden test cases returned (TC09, BR-009, Rule 2).
   */
  async getAssignedAssessments(userId: string): Promise<CandidateAssignedAssessmentDto[]> {
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

    const assignments = await this.prisma.assessmentAssignment.findMany({
      where: {
        candidateId: candidate.id,
        assignmentStatus: { not: 'REVOKED' },
      },
      include: {
        assessment: true,
        sessions: {
          select: {
            id: true,
            sessionStatus: true,
            startedAt: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        assessment: {
          startAt: 'asc',
        },
      },
    });

    const now = new Date();

    return assignments.map((assignment) => {
      const asmt = assignment.assessment;
      const attemptsUsed = assignment.sessions.length;
      const attemptsRemaining = Math.max(0, asmt.attemptLimit - attemptsUsed);

      const isAccountActive = candidate.user.accountStatus === AccountStatus.ACTIVE;
      const isStatusValid =
        asmt.status === AssessmentStatus.ACTIVE || asmt.status === AssessmentStatus.SCHEDULED;
      const isWindowOpen = now >= asmt.startAt && now <= asmt.endAt;
      const hasAttemptsLeft = attemptsRemaining > 0;

      const isEligible = isAccountActive && isStatusValid && isWindowOpen && hasAttemptsLeft;
      let eligibilityReason: string | undefined = undefined;

      if (!isAccountActive) {
        eligibilityReason = 'Account is not active';
      } else if (!isStatusValid) {
        eligibilityReason = `Assessment is ${asmt.status.toLowerCase()}`;
      } else if (now < asmt.startAt) {
        eligibilityReason = 'Assessment availability window has not opened yet';
      } else if (now > asmt.endAt) {
        eligibilityReason = 'Assessment availability window has closed';
      } else if (!hasAttemptsLeft) {
        eligibilityReason = 'Maximum attempt limit exhausted';
      }

      // Security check (TC09): Ensure only candidate-safe metadata is serialized
      return {
        assignmentId: assignment.id,
        assessmentId: asmt.id,
        title: asmt.title,
        description: asmt.description,
        instructions: asmt.instructions,
        roleCategory: asmt.roleCategory,
        overallDuration: asmt.overallDuration,
        totalMarks: asmt.totalMarks !== null ? Number(asmt.totalMarks) : null,
        startAt: asmt.startAt.toISOString(),
        endAt: asmt.endAt.toISOString(),
        status: asmt.status as AssessmentStatus,
        attemptLimit: asmt.attemptLimit,
        attemptsUsed,
        attemptsRemaining,
        isEligible,
        eligibilityReason,
        navigationMode: asmt.navigationMode as NavigationMode,
        serverTime: now.toISOString(),
      };
    });
  }
}
