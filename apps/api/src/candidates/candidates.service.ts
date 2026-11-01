import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCandidateDto,
  UpdateCandidateDto,
  AssignAssessmentDto,
  UnassignAssessmentDto,
} from './dto/candidate.dto';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  AccountStatus,
  UserRole,
  AuditOutcome,
  AssignmentStatus,
  CandidateCsvImportResult,
  CandidateCsvImportError,
} from '@verisync/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates a cryptographically strong temporary password (FR-AUTH-009, UC-02).
   */
  generateTemporaryPassword(): string {
    const raw = randomBytes(8).toString('base64url');
    return `Vs!${raw}9A`;
  }

  /**
   * Create candidate record with complete profile fields and account status (FR-CAN-001, FR-CAN-007, FR-AUTH-009, UC-02).
   */
  async createCandidate(dto: CreateCandidateDto, actorUserId: string, correlationId: string) {
    const candidateIdentifier = dto.candidateIdentifier.trim();
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();

    // 1. Enforce unique candidate IDs and usernames (FR-CAN-007, UC-02 alt flow 2a)
    const existingId = await this.prisma.candidateProfile.findUnique({
      where: { candidateIdentifier },
    });
    if (existingId) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Candidate ID '${candidateIdentifier}' already exists`,
        { field: 'candidateIdentifier' },
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Username '${username}' is already in use`,
        { field: 'username' },
      );
    }

    const existingEmail = await this.prisma.candidateProfile.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Email '${email}' is already registered`,
        { field: 'email' },
      );
    }

    // 2. Provision temporary credentials securely (FR-AUTH-009, UC-02)
    const rawPassword =
      dto.password && dto.password.trim().length >= 8
        ? dto.password.trim()
        : this.generateTemporaryPassword();

    const passwordHash = await this.passwordService.hashPassword(rawPassword);

    // 3. Persist User and CandidateProfile records
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        role: UserRole.CANDIDATE,
        accountStatus: AccountStatus.ACTIVE,
        candidateProfile: {
          create: {
            candidateIdentifier,
            fullName: dto.fullName.trim(),
            email,
            phone: dto.phone?.trim() || null,
            institution: dto.institution.trim(),
            qualification: dto.qualification.trim(),
            graduationYear: dto.graduationYear,
            recruitmentReference: dto.recruitmentReference.trim(),
          },
        },
      },
      include: {
        candidateProfile: true,
      },
    });

    const profile = user.candidateProfile!;

    // 4. Record audit event (FR-AUD-001, Rule 5 - NO secrets in audit logs!)
    await this.auditService.log({
      actorUserId,
      eventType: 'CANDIDATE_CREATED',
      affectedEntity: `candidate:${profile.candidateIdentifier}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        candidateId: profile.id,
        candidateIdentifier: profile.candidateIdentifier,
        username: user.username,
        email: profile.email,
        institution: profile.institution,
        recruitmentReference: profile.recruitmentReference,
      },
    });

    return {
      candidate: {
        id: profile.id,
        candidateIdentifier: profile.candidateIdentifier,
        userId: user.id,
        fullName: profile.fullName,
        username: user.username,
        email: profile.email,
        phone: profile.phone,
        institution: profile.institution,
        qualification: profile.qualification,
        graduationYear: profile.graduationYear,
        recruitmentReference: profile.recruitmentReference,
        accountStatus: user.accountStatus as AccountStatus,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      // Returned exclusively to the invoking administrator, never logged or exported
      temporaryPassword: rawPassword,
    };
  }

  /**
   * Search and filter candidates by candidate ID, name, email, institution, drive, and status (FR-CAN-004).
   */
  async listCandidates(query: {
    search?: string;
    recruitmentReference?: string;
    institution?: string;
    accountStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.recruitmentReference) {
      where.recruitmentReference = query.recruitmentReference.trim();
    }
    if (query.institution) {
      where.institution = {
        contains: query.institution.trim(),
        mode: 'insensitive',
      };
    }
    if (query.accountStatus) {
      where.user = {
        accountStatus: query.accountStatus,
      };
    }

    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { candidateIdentifier: { contains: s, mode: 'insensitive' } },
        { fullName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { user: { username: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, profiles] = await Promise.all([
      this.prisma.candidateProfile.count({ where }),
      this.prisma.candidateProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              accountStatus: true,
            },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: profiles.map((p) => ({
        id: p.id,
        candidateIdentifier: p.candidateIdentifier,
        userId: p.userId,
        fullName: p.fullName,
        username: p.user?.username || '',
        email: p.email,
        phone: p.phone,
        institution: p.institution,
        qualification: p.qualification,
        graduationYear: p.graduationYear,
        recruitmentReference: p.recruitmentReference,
        accountStatus: (p.user?.accountStatus as AccountStatus) || AccountStatus.ACTIVE,
        testsAssigned: p._count.assignments,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single candidate by profile ID, identifier, or User ID (FR-CAN-001).
   */
  async getCandidateById(id: string) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id }, { candidateIdentifier: id }, { userId: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            accountStatus: true,
            role: true,
            failedLoginAttempts: true,
            lockoutUntil: true,
          },
        },
        assignments: {
          include: {
            assessment: {
              select: {
                id: true,
                title: true,
                status: true,
                startAt: true,
                endAt: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Candidate record not found for '${id}'`,
      );
    }

    return {
      id: profile.id,
      candidateIdentifier: profile.candidateIdentifier,
      userId: profile.userId,
      fullName: profile.fullName,
      username: profile.user.username,
      email: profile.email,
      phone: profile.phone,
      institution: profile.institution,
      qualification: profile.qualification,
      graduationYear: profile.graduationYear,
      recruitmentReference: profile.recruitmentReference,
      accountStatus: profile.user.accountStatus as AccountStatus,
      assignments: profile.assignments.map((a) => ({
        assignmentId: a.id,
        assessmentId: a.assessmentId,
        title: a.assessment.title,
        status: a.assessment.status,
        assignmentStatus: a.assignmentStatus,
        assignedAt: a.assignedAt.toISOString(),
      })),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  /**
   * Edit candidate profile details with audit logging (FR-CAN-002).
   */
  async updateCandidate(
    id: string,
    dto: UpdateCandidateDto,
    actorUserId: string,
    correlationId: string,
  ) {
    const candidate = await this.prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id }, { candidateIdentifier: id }, { userId: id }],
      },
      include: { user: true },
    });

    if (!candidate) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Candidate record '${id}' not found`,
      );
    }

    // Email uniqueness check if changing
    if (dto.email && dto.email.trim().toLowerCase() !== candidate.email.toLowerCase()) {
      const emailTaken = await this.prisma.candidateProfile.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (emailTaken && emailTaken.id !== candidate.id) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          `Email '${dto.email}' is already in use by another candidate`,
          { field: 'email' },
        );
      }
    }

    // Update profile and optionally User account status
    await this.prisma.candidateProfile.update({
      where: { id: candidate.id },
      data: {
        fullName: dto.fullName?.trim() || undefined,
        email: dto.email?.trim().toLowerCase() || undefined,
        phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
        institution: dto.institution?.trim() || undefined,
        qualification: dto.qualification?.trim() || undefined,
        graduationYear: dto.graduationYear || undefined,
        recruitmentReference: dto.recruitmentReference?.trim() || undefined,
      },
    });

    if (dto.accountStatus && dto.accountStatus !== candidate.user.accountStatus) {
      await this.prisma.user.update({
        where: { id: candidate.userId },
        data: {
          accountStatus: dto.accountStatus,
          // Revoke sessions on deactivation / lock (FR-AUTH-006)
          tokenVersion: { increment: 1 },
        },
      });
    }

    await this.auditService.log({
      actorUserId,
      eventType: 'CANDIDATE_UPDATED',
      affectedEntity: `candidate:${candidate.candidateIdentifier}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        candidateId: candidate.id,
        candidateIdentifier: candidate.candidateIdentifier,
        changes: dto,
      },
    });

    return this.getCandidateById(candidate.id);
  }

  /**
   * Bulk candidate import via CSV with validated template and per-row error reporting (FR-CAN-003, UC-03).
   * Invalid rows are reported and never create incomplete records.
   */
  async bulkImportCandidates(
    csvData: string,
    actorUserId: string,
    correlationId: string,
  ): Promise<CandidateCsvImportResult> {
    if (!csvData || csvData.trim().length === 0) {
      throw new ApiErrorException(ApiErrorCode.VALIDATION_FAILED, 'CSV data payload is empty');
    }

    const lines = csvData
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'CSV must contain a header row and at least one data row',
      );
    }

    // Header validation (FR-CAN-003: validated template)
    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const requiredColumns = [
      'candidateid',
      'fullname',
      'username',
      'email',
      'institution',
      'qualification',
      'graduationyear',
      'recruitmentreference',
    ];

    for (const reqCol of requiredColumns) {
      if (!headers.includes(reqCol)) {
        throw new ApiErrorException(
          ApiErrorCode.VALIDATION_FAILED,
          `Invalid CSV template. Missing required column: '${reqCol}'. Expected: candidateId,fullName,username,email,phone,institution,qualification,graduationYear,recruitmentReference`,
        );
      }
    }

    const colIndex = {
      candidateId: headers.indexOf('candidateid'),
      fullName: headers.indexOf('fullname'),
      username: headers.indexOf('username'),
      email: headers.indexOf('email'),
      phone: headers.indexOf('phone'),
      institution: headers.indexOf('institution'),
      qualification: headers.indexOf('qualification'),
      graduationYear: headers.indexOf('graduationyear'),
      recruitmentReference: headers.indexOf('recruitmentreference'),
    };

    const errors: CandidateCsvImportError[] = [];
    const importedCandidates: Array<{
      candidateId: string;
      username: string;
      email: string;
      temporaryPassword?: string;
    }> = [];

    // Internal duplicate tracking across the batch
    const batchCandidateIds = new Set<string>();
    const batchUsernames = new Set<string>();
    const batchEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowNum = i + 1; // 1-indexed row in file

      const candidateIdentifier = cols[colIndex.candidateId] || '';
      const fullName = cols[colIndex.fullName] || '';
      const username = cols[colIndex.username] || '';
      const email = (cols[colIndex.email] || '').toLowerCase();
      const phone = colIndex.phone >= 0 ? cols[colIndex.phone] : null;
      const institution = cols[colIndex.institution] || '';
      const qualification = cols[colIndex.qualification] || '';
      const gradYearRaw = cols[colIndex.graduationYear] || '';
      const recruitmentReference = cols[colIndex.recruitmentReference] || '';

      // 1. Mandatory field presence validation
      if (!candidateIdentifier) {
        errors.push({ row: rowNum, field: 'candidateId', error: 'candidateId is required' });
        continue;
      }
      if (!fullName) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'fullName',
          error: 'fullName is required',
        });
        continue;
      }
      if (!username) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'username',
          error: 'username is required',
        });
        continue;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'email',
          error: 'Valid email is required',
        });
        continue;
      }
      const gradYear = parseInt(gradYearRaw, 10);
      if (isNaN(gradYear) || gradYear < 2000 || gradYear > 2100) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'graduationYear',
          error: 'graduationYear must be a valid integer between 2000 and 2100',
        });
        continue;
      }
      if (!institution) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'institution',
          error: 'institution is required',
        });
        continue;
      }
      if (!qualification) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'qualification',
          error: 'qualification is required',
        });
        continue;
      }
      if (!recruitmentReference) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'recruitmentReference',
          error: 'recruitmentReference is required',
        });
        continue;
      }

      // 2. Intra-batch duplicate check
      if (batchCandidateIds.has(candidateIdentifier)) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'candidateId',
          error: 'Duplicate candidateId within CSV file',
        });
        continue;
      }
      if (batchUsernames.has(username)) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'username',
          error: 'Duplicate username within CSV file',
        });
        continue;
      }
      if (batchEmails.has(email)) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'email',
          error: 'Duplicate email within CSV file',
        });
        continue;
      }

      // 3. Database uniqueness check (FR-CAN-007)
      const [existingId, existingUser, existingEmail] = await Promise.all([
        this.prisma.candidateProfile.findUnique({ where: { candidateIdentifier } }),
        this.prisma.user.findUnique({ where: { username } }),
        this.prisma.candidateProfile.findUnique({ where: { email } }),
      ]);

      if (existingId) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'candidateId',
          error: `Candidate ID '${candidateIdentifier}' already exists in database`,
        });
        continue;
      }
      if (existingUser) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'username',
          error: `Username '${username}' already exists in database`,
        });
        continue;
      }
      if (existingEmail) {
        errors.push({
          row: rowNum,
          candidateId: candidateIdentifier,
          field: 'email',
          error: `Email '${email}' already exists in database`,
        });
        continue;
      }

      // 4. Create candidate with provisioned temporary credential
      const tempPassword = this.generateTemporaryPassword();
      const passwordHash = await this.passwordService.hashPassword(tempPassword);

      await this.prisma.user.create({
        data: {
          username,
          passwordHash,
          role: UserRole.CANDIDATE,
          accountStatus: AccountStatus.ACTIVE,
          candidateProfile: {
            create: {
              candidateIdentifier,
              fullName,
              email,
              phone: phone || null,
              institution,
              qualification,
              graduationYear: gradYear,
              recruitmentReference,
            },
          },
        },
      });

      batchCandidateIds.add(candidateIdentifier);
      batchUsernames.add(username);
      batchEmails.add(email);

      importedCandidates.push({
        candidateId: candidateIdentifier,
        username,
        email,
        temporaryPassword: tempPassword,
      });
    }

    // Record audit event
    await this.auditService.log({
      actorUserId,
      eventType: 'CANDIDATE_BULK_IMPORTED',
      affectedEntity: 'candidate:batch_import',
      outcome: errors.length === 0 ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      correlationId,
      metadata: {
        totalRows: lines.length - 1,
        importedCount: importedCandidates.length,
        errorCount: errors.length,
      },
    });

    return {
      totalRows: lines.length - 1,
      importedCount: importedCandidates.length,
      errorCount: errors.length,
      errors,
      importedCandidates,
    };
  }

  /**
   * Candidate login and authentication activity history inspection (FR-CAN-006).
   */
  async getCandidateLoginHistory(id: string) {
    const candidate = await this.prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id }, { candidateIdentifier: id }, { userId: id }],
      },
      include: { user: true },
    });

    if (!candidate) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Candidate record not found for '${id}'`,
      );
    }

    const events = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { actorUserId: candidate.userId },
          { affectedEntity: `candidate:${candidate.candidateIdentifier}` },
          { affectedEntity: `user:${candidate.user.username}` },
          { affectedEntity: `user:${candidate.candidateIdentifier}` },
        ],
      },
      orderBy: { eventTimestamp: 'desc' },
      take: 50,
    });

    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      outcome: e.outcome,
      timestamp: e.eventTimestamp.toISOString(),
      correlationId: e.correlationId,
      metadata: e.metadata,
    }));
  }

  /**
   * Assign assessments to candidates individually or by cohort/group (FR-CAN-004, FR-ASMT-005, UC-06).
   */
  async assignAssessment(dto: AssignAssessmentDto, actorUserId: string, correlationId: string) {
    // 1. Verify assessment exists and is not Archived/Completed
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: dto.assessmentId },
    });
    if (!assessment) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Assessment '${dto.assessmentId}' does not exist`,
      );
    }

    if (assessment.status === 'ARCHIVED' || assessment.status === 'COMPLETED') {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Cannot assign assessment in status '${assessment.status}'`,
      );
    }

    // 2. Resolve candidate IDs
    const targetCandidateProfileIds = new Set<string>();

    if (dto.candidateIds && dto.candidateIds.length > 0) {
      const explicitCandidates = await this.prisma.candidateProfile.findMany({
        where: {
          OR: [{ id: { in: dto.candidateIds } }, { candidateIdentifier: { in: dto.candidateIds } }],
        },
        select: { id: true },
      });
      explicitCandidates.forEach((c) => targetCandidateProfileIds.add(c.id));
    }

    if (dto.groupFilter) {
      const groupWhere: any = {};
      if (dto.groupFilter.recruitmentReference) {
        groupWhere.recruitmentReference = dto.groupFilter.recruitmentReference.trim();
      }
      if (dto.groupFilter.institution) {
        groupWhere.institution = {
          contains: dto.groupFilter.institution.trim(),
          mode: 'insensitive',
        };
      }
      if (dto.groupFilter.graduationYear) {
        groupWhere.graduationYear = dto.groupFilter.graduationYear;
      }

      const groupCandidates = await this.prisma.candidateProfile.findMany({
        where: groupWhere,
        select: { id: true },
      });
      groupCandidates.forEach((c) => targetCandidateProfileIds.add(c.id));
    }

    if (targetCandidateProfileIds.size === 0) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'No matching candidates found for assignment',
      );
    }

    let assignedCount = 0;
    for (const candidateId of targetCandidateProfileIds) {
      const existing = await this.prisma.assessmentAssignment.findUnique({
        where: {
          assessmentId_candidateId: {
            assessmentId: assessment.id,
            candidateId,
          },
        },
      });

      if (!existing) {
        await this.prisma.assessmentAssignment.create({
          data: {
            assessmentId: assessment.id,
            candidateId,
            assignedBy: actorUserId,
            assignmentStatus: AssignmentStatus.ASSIGNED,
          },
        });
        assignedCount++;
      }
    }

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_ASSIGNED',
      affectedEntity: `assessment:${assessment.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        candidatesCount: targetCandidateProfileIds.size,
        newlyAssignedCount: assignedCount,
      },
    });

    return {
      assessmentId: assessment.id,
      totalMatched: targetCandidateProfileIds.size,
      assignedCount,
    };
  }

  /**
   * Revoke/remove candidate assessment assignment before start (FR-CAN-005).
   */
  async unassignAssessment(dto: UnassignAssessmentDto, actorUserId: string, correlationId: string) {
    const candidate = await this.prisma.candidateProfile.findFirst({
      where: {
        OR: [{ id: dto.candidateId }, { candidateIdentifier: dto.candidateId }],
      },
    });

    if (!candidate) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        `Candidate '${dto.candidateId}' not found`,
      );
    }

    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: {
        assessmentId_candidateId: {
          assessmentId: dto.assessmentId,
          candidateId: candidate.id,
        },
      },
      include: {
        sessions: true,
      },
    });

    if (!assignment) {
      throw new ApiErrorException(
        ApiErrorCode.VALIDATION_FAILED,
        'Candidate is not assigned to this assessment',
      );
    }

    // Check if session has started (FR-CAN-005)
    const hasStarted = assignment.sessions.some(
      (s) => s.sessionStatus !== 'NOT_STARTED' && s.sessionStatus !== 'READY',
    );

    if (hasStarted) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        'Cannot unassign candidate after assessment attempt has commenced (FR-CAN-005)',
      );
    }

    await this.prisma.assessmentAssignment.delete({
      where: { id: assignment.id },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'ASSESSMENT_UNASSIGNED',
      affectedEntity: `assessment:${dto.assessmentId}:candidate:${candidate.candidateIdentifier}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        assessmentId: dto.assessmentId,
        candidateId: candidate.id,
        candidateIdentifier: candidate.candidateIdentifier,
      },
    });

    return {
      success: true,
      message: `Assessment assignment revoked for candidate '${candidate.candidateIdentifier}'`,
    };
  }
}
