/**
 * VeriSync Mock Service Worker (MSW) Handlers
 * Matches packages/shared/openapi.yaml and docs/design/UI_Sample.jpeg exactly.
 * Traceability: FR-AUTH-001, FR-AUTH-008, FR-ADMIN-001, SRS 8.3.3, Rule 9
 */

import { http, HttpResponse } from 'msw';
import { ApiErrorCode } from '@verisync/shared';
import {
  DashboardStats,
  CandidateRecord,
  QuestionRecord,
  AssessmentRecord,
  AssessmentStatus,
  LiveSessionRecord,
  SessionOverrideType,
  AuditLogEntry,
  IncidentRecord,
  AssessmentResultRecord,
  ScoreCorrectionPayload,
  EvaluationQueueItem,
  AssessmentSummaryReport,
  CandidateRankingItem,
  QuestionPerformanceStats,
} from '../types/api';

export const handlers = [
  // GET /api/v1/health (Rule 9, FR-TIME-001)
  http.get(/\/api\/v1\/health$/, () => {
    return HttpResponse.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      version: '1.1.0',
    });
  }),

  // POST /api/v1/auth/login (FR-AUTH-001, FR-AUTH-008)
  http.post(/\/api\/v1\/auth\/login$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      identifier?: string;
      password?: string;
    };

    if (!body.identifier || !body.password) {
      return HttpResponse.json(
        {
          status: 'rejected',
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Both username/email and password are required.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 422 },
      );
    }

    if (body.identifier.includes('locked')) {
      return HttpResponse.json(
        {
          status: 'rejected',
          code: ApiErrorCode.RATE_LIMITED,
          message: 'Too many failed login attempts. Account temporarily locked for 15 minutes.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 429 },
      );
    }

    if (body.password === 'wrong' || body.password === 'invalid') {
      return HttpResponse.json(
        {
          status: 'rejected',
          code: ApiErrorCode.UNAUTHENTICATED,
          message: 'Invalid username/candidate ID or password.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 401 },
      );
    }

    // Role-aware test login: Evaluator without MFA
    if (body.identifier.includes('evaluator')) {
      return HttpResponse.json({
        mfaRequired: false,
        accessToken: `mock_evaluator_jwt_${Date.now()}`,
        refreshToken: `mock_evaluator_refresh_${Date.now()}`,
        user: {
          id: 'usr_eval_01',
          username: body.identifier,
          fullName: 'Technical Evaluator',
          email: body.identifier,
          role: 'TECHNICAL_EVALUATOR',
        },
      });
    }

    // Default Super Admin with MFA challenge (FR-AUTH-008)
    return HttpResponse.json({
      mfaRequired: true,
      mfaToken: `mock_mfa_token_${Date.now().toString(36)}`,
    });
  }),

  // POST /api/v1/auth/mfa/verify (FR-AUTH-008)
  http.post(/\/api\/v1\/auth\/mfa\/verify$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      mfaToken?: string;
      code?: string;
    };

    if (!body.mfaToken) {
      return HttpResponse.json(
        {
          status: 'rejected',
          code: ApiErrorCode.UNAUTHENTICATED,
          message: 'MFA challenge session expired or invalid.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 401 },
      );
    }

    if (!body.code || body.code.length !== 6 || body.code === '000000') {
      return HttpResponse.json(
        {
          status: 'rejected',
          code: ApiErrorCode.UNAUTHENTICATED,
          message: 'Invalid or expired 6-digit MFA verification code.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: `mock_jwt_access_super_admin_${Date.now()}`,
      refreshToken: `mock_jwt_refresh_super_admin_${Date.now()}`,
      user: {
        id: 'usr_admin_01',
        username: 'admin',
        fullName: 'Super Admin',
        email: 'admin@verisync.com',
        role: 'SUPER_ADMIN',
      },
    });
  }),

  // POST /api/v1/auth/refresh (FR-AUTH-007)
  http.post(/\/api\/v1\/auth\/refresh$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      refreshToken?: string;
    };

    if (!body.refreshToken || body.refreshToken.includes('expired')) {
      return HttpResponse.json(
        {
          status: 'rejected',
          code: ApiErrorCode.UNAUTHENTICATED,
          message: 'Refresh token invalid or expired.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: `mock_rotated_access_${Date.now()}`,
      refreshToken: `mock_rotated_refresh_${Date.now()}`,
    });
  }),

  // POST /api/v1/auth/logout (FR-AUTH-006, FR-AUTH-007)
  http.post(/\/api\/v1\/auth\/logout$/, () => {
    return HttpResponse.json({
      success: true,
      message: 'Session revoked successfully.',
    });
  }),

  // GET /api/v1/admin/dashboard-stats (FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-003, UI_Sample.jpeg)
  http.get(/\/api\/v1\/admin\/dashboard-stats$/, () => {
    const totalCandidatesCount = 1248 + (mockCandidates.length - 7);
    const totalAssessmentsCount = 24 + (mockAssessments.length - 3);
    const completedCount = 892 + (mockResults.length - 8);
    const activeCandidatesCount =
      356 + (mockLiveSessions.filter((s) => s.status === 'ACTIVE').length - 1);
    const inProgressCount = 214;
    const notStartedCount = 142;

    const stats: DashboardStats = {
      totalCandidates: { value: totalCandidatesCount, trend: '+ 12%' },
      totalAssessments: { value: totalAssessmentsCount, trend: '+ 3' },
      completedTests: { value: completedCount, trend: '+ 10%' },
      activeCandidates: { value: activeCandidatesCount, trend: '+ 6%' },
      recentActivity: [
        {
          id: 'act-1',
          type: 'candidate_added',
          title: 'New candidate added',
          description: 'Rohan Mehta',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          timeAgo: '10 mins ago',
        },
        {
          id: 'act-2',
          type: 'assessment_scheduled',
          title: 'Assessment scheduled',
          description: 'Technical Assessment - Round 1',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          timeAgo: '1 hour ago',
        },
        {
          id: 'act-3',
          type: 'test_completed',
          title: 'Test completed',
          description: 'Aisha Khan',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2 hours ago',
        },
        {
          id: 'act-4',
          type: 'questions_added',
          title: 'New questions added',
          description: 'Data Structures (5 questions)',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          timeAgo: '3 hours ago',
        },
      ],
      completionRate: {
        percentage: 72,
        completed: completedCount,
        inProgress: inProgressCount,
        notStarted: notStartedCount,
      },
      upcomingAssessments: [
        {
          id: 'asmt-01',
          title: 'Frontend Developer Test',
          scheduleText: '24 Oct 2024 | 10:00 AM',
          status: 'Scheduled',
        },
        {
          id: 'asmt-02',
          title: 'Data Analyst Assessment',
          scheduleText: '25 Oct 2024 | 02:00 PM',
          status: 'Scheduled',
        },
      ],
    };

    return HttpResponse.json(stats);
  }),

  // ==========================================
  // CANDIDATES API (FR-CAN-001..007)
  // ==========================================

  // GET /api/v1/admin/candidates
  http.get(/\/api\/v1\/admin\/candidates$/, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const status = url.searchParams.get('status') || '';
    const drive = url.searchParams.get('drive') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '6', 10);

    let filtered = [...mockCandidates];

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(search) ||
          c.candidateIdentifier.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.username.toLowerCase().includes(search),
      );
    }

    if (status && status !== 'ALL') {
      filtered = filtered.filter((c) => c.accountStatus === status);
    }

    if (drive && drive !== 'ALL') {
      filtered = filtered.filter((c) => c.recruitmentReference === drive);
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return HttpResponse.json({
      candidates: paginated,
      total,
      page,
      limit,
      totalPages,
    });
  }),

  // GET /api/v1/admin/candidates/:id
  http.get(/\/api\/v1\/admin\/candidates\/([^/]+)$/, ({ params }) => {
    const candidateId = params[0] as string;
    const candidate = mockCandidates.find(
      (c) => c.id === candidateId || c.candidateIdentifier === candidateId,
    );

    if (!candidate) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Candidate with ID ${candidateId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      ...candidate,
      loginHistory: [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.105',
          userAgent: 'Chrome 122 / Windows 11',
          status: 'SUCCESS',
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
          ipAddress: '192.168.1.105',
          userAgent: 'Chrome 122 / Windows 11',
          status: 'SUCCESS',
        },
      ],
      assignments: [
        {
          assignmentId: 'asgn-01',
          assessmentId: 'asmt-01',
          assessmentTitle: 'Frontend Developer Test',
          roleCategory: 'Frontend Engineering',
          assignedAt: '2026-10-20T10:00:00Z',
          scheduleWindow: '24 Oct 2024, 10:00 AM - 12:00 PM',
          status: 'READY',
        },
      ],
    });
  }),

  // POST /api/v1/admin/candidates
  http.post(/\/api\/v1\/admin\/candidates$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const candidateIdentifier =
      (body.candidateIdentifier as string) ||
      `CAN-2026-${String(mockCandidates.length + 1).padStart(3, '0')}`;
    const fullName = (body.fullName as string) || '';
    const username =
      (body.username as string) || candidateIdentifier.toLowerCase().replace('-', '.');
    const email = (body.email as string) || '';

    if (!fullName || !email) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Full name and email are required.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 422 },
      );
    }

    const tempPassword = `Temp@${Math.random().toString(36).slice(-6)}!`;

    const newCandidate = {
      id: `can-${Date.now().toString(36)}`,
      candidateIdentifier,
      fullName,
      username,
      email,
      phone: (body.phone as string) || null,
      institution: (body.institution as string) || 'National Institute of Technology',
      qualification: (body.qualification as string) || 'B.Tech CS',
      graduationYear: Number(body.graduationYear) || 2026,
      recruitmentReference: (body.recruitmentReference as string) || 'Campus 2026',
      accountStatus: 'ACTIVE' as const,
      testsAssignedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCandidates.unshift(newCandidate);

    return HttpResponse.json(
      {
        candidate: newCandidate,
        temporaryPassword: tempPassword,
      },
      { status: 201 },
    );
  }),

  // PUT /api/v1/admin/candidates/:id
  http.put(/\/api\/v1\/admin\/candidates\/([^/]+)$/, async ({ params, request }) => {
    const candidateId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const index = mockCandidates.findIndex((c) => c.id === candidateId);

    if (index === -1) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Candidate ${candidateId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    mockCandidates[index] = {
      ...mockCandidates[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ candidate: mockCandidates[index] });
  }),

  // PATCH /api/v1/admin/candidates/:id/status
  http.patch(/\/api\/v1\/admin\/candidates\/([^/]+)\/status$/, async ({ params, request }) => {
    const candidateId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as {
      status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
    };
    const index = mockCandidates.findIndex((c) => c.id === candidateId);

    if (index === -1) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Candidate ${candidateId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    mockCandidates[index].accountStatus = body.status || 'INACTIVE';
    mockCandidates[index].updatedAt = new Date().toISOString();

    return HttpResponse.json({ success: true, candidate: mockCandidates[index] });
  }),

  // POST /api/v1/admin/candidates/:id/reset-password
  http.post(/\/api\/v1\/admin\/candidates\/([^/]+)\/reset-password$/, ({ params }) => {
    const candidateId = params[0] as string;
    const candidate = mockCandidates.find((c) => c.id === candidateId);

    if (!candidate) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Candidate ${candidateId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    const tempPassword = `Reset@${Math.random().toString(36).slice(-6)}#`;
    return HttpResponse.json({
      success: true,
      temporaryPassword: tempPassword,
      message: 'Temporary password generated successfully.',
    });
  }),

  // POST /api/v1/admin/candidates/import-csv
  http.post(/\/api\/v1\/admin\/candidates\/import-csv$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { csvData?: string };
    const lines = (body.csvData || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'CSV file is empty or missing headers.',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 422 },
      );
    }

    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const idIdx = headers.findIndex((h) => h.includes('identifier') || h === 'id');
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const phoneIdx = headers.findIndex((h) => h.includes('phone'));
    const instIdx = headers.findIndex((h) => h.includes('inst'));
    const qualIdx = headers.findIndex((h) => h.includes('qual'));
    const gradIdx = headers.findIndex((h) => h.includes('grad') || h.includes('year'));
    const driveIdx = headers.findIndex(
      (h) => h.includes('drive') || h.includes('reference') || h.includes('ref'),
    );

    const rows = lines.slice(1).filter((l) => l.trim().length > 0);
    const errors: Array<{ row: number; candidateId?: string; field?: string; error: string }> = [];
    const imported: typeof mockCandidates = [];

    rows.forEach((line, idx) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowNum = idx + 2;

      const identifier = idIdx >= 0 ? cols[idIdx] : cols[0];
      const fullName = nameIdx >= 0 ? cols[nameIdx] : cols[1];
      const email = emailIdx >= 0 ? cols[emailIdx] : cols[2];
      const phone = phoneIdx >= 0 ? cols[phoneIdx] : null;
      const institution = instIdx >= 0 ? cols[instIdx] : 'Engineering Institute';
      const qualification = qualIdx >= 0 ? cols[qualIdx] : 'B.Tech';
      const gradYear = gradIdx >= 0 ? cols[gradIdx] : '2026';
      const drive = driveIdx >= 0 ? cols[driveIdx] : 'Campus Drive 2026';

      if (!fullName) {
        errors.push({
          row: rowNum,
          candidateId: identifier || `ROW-${rowNum}`,
          field: 'fullName',
          error: 'Full name is required',
        });
        return;
      }
      if (!email || !email.includes('@')) {
        errors.push({
          row: rowNum,
          candidateId: identifier || `ROW-${rowNum}`,
          field: 'email',
          error: 'Valid email is required',
        });
        return;
      }

      const newCan = {
        id: `can-csv-${Date.now().toString(36)}-${idx}`,
        candidateIdentifier:
          identifier ||
          `CAN-2026-${String(mockCandidates.length + imported.length + 1).padStart(3, '0')}`,
        fullName,
        username: (identifier || fullName).toLowerCase().replace(/\s+/g, '.'),
        email,
        phone,
        institution,
        qualification,
        graduationYear: parseInt(gradYear, 10) || 2026,
        recruitmentReference: drive,
        accountStatus: 'ACTIVE' as const,
        testsAssignedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      imported.push(newCan);
    });

    mockCandidates.unshift(...imported);

    return HttpResponse.json({
      totalRows: rows.length,
      importedCount: imported.length,
      errorCount: errors.length,
      errors,
      importedCandidates: imported,
    });
  }),

  // POST /api/v1/admin/candidates/assign
  http.post(/\/api\/v1\/admin\/candidates\/assign$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      assessmentId?: string;
      candidateIds?: string[];
      groupFilter?: { recruitmentReference?: string };
    };

    let targetCount = body.candidateIds?.length || 0;
    if (body.groupFilter?.recruitmentReference) {
      targetCount = mockCandidates.filter(
        (c) => c.recruitmentReference === body.groupFilter?.recruitmentReference,
      ).length;
    }

    mockCandidates.forEach((c) => {
      if (
        body.candidateIds?.includes(c.id) ||
        (body.groupFilter && c.recruitmentReference === body.groupFilter.recruitmentReference)
      ) {
        c.testsAssignedCount += 1;
      }
    });

    return HttpResponse.json({
      success: true,
      assignedCount: targetCount,
      alreadyAssignedCount: 0,
      message: `Successfully assigned assessment to ${targetCount} candidate(s).`,
    });
  }),

  // POST /api/v1/admin/candidates/unassign
  http.post(/\/api\/v1\/admin\/candidates\/unassign$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { candidateId?: string };
    const cand = mockCandidates.find((c) => c.id === body.candidateId);
    if (cand && cand.testsAssignedCount > 0) {
      cand.testsAssignedCount -= 1;
    }
    return HttpResponse.json({
      success: true,
      message: 'Candidate assignment successfully revoked.',
    });
  }),

  // ==========================================
  // QUESTION BANK API (FR-QB-001..010)
  // ==========================================

  // GET /api/v1/admin/questions
  http.get(/\/api\/v1\/admin\/questions$/, ({ request }) => {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || '';
    const difficulty = url.searchParams.get('difficulty') || '';
    const type = url.searchParams.get('type') || '';
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    let list = [...mockQuestions];

    if (topic && topic !== 'ALL') {
      list = list.filter((q) => q.topic.toLowerCase() === topic.toLowerCase());
    }
    if (difficulty && difficulty !== 'ALL') {
      list = list.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (type && type !== 'ALL') {
      list = list.filter((q) => q.questionType === type);
    }
    if (search) {
      list = list.filter(
        (q) =>
          q.questionText.toLowerCase().includes(search) || q.topic.toLowerCase().includes(search),
      );
    }

    return HttpResponse.json({
      questions: list,
      total: list.length,
    });
  }),

  // GET /api/v1/admin/questions/:id
  http.get(/\/api\/v1\/admin\/questions\/([^/]+)$/, ({ params }) => {
    const qId = params[0] as string;
    const question = mockQuestions.find((q) => q.id === qId);

    if (!question) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Question ${qId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(question);
  }),

  // POST /api/v1/admin/questions
  http.post(/\/api\/v1\/admin\/questions$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const newQuestion = {
      id: `q-${Date.now().toString(36)}`,
      questionType: (body.questionType as string) || 'MCQ_SINGLE',
      questionText: (body.questionText as string) || '',
      codeSnippet: (body.codeSnippet as string) || null,
      topic: (body.topic as string) || 'General',
      difficulty: ((body.difficulty as string) || 'Medium') as 'Easy' | 'Medium' | 'Hard',
      maximumMarks: Number(body.maximumMarks) || 5,
      negativeMarks: Number(body.negativeMarks) || 0,
      explanation: (body.explanation as string) || null,
      status: 'ACTIVE' as const,
      options:
        (body.options as Array<{ optionText: string; displayOrder: number; isCorrect: boolean }>) ||
        [],
      testCases:
        (body.testCases as Array<{
          inputData: string;
          expectedOutput: string;
          visibility: 'SAMPLE' | 'HIDDEN';
        }>) || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQuestions.unshift(newQuestion as any);

    return HttpResponse.json(newQuestion, { status: 201 });
  }),

  // PUT /api/v1/admin/questions/:id
  http.put(/\/api\/v1\/admin\/questions\/([^/]+)$/, async ({ params, request }) => {
    const qId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const idx = mockQuestions.findIndex((q) => q.id === qId);

    if (idx === -1) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Question ${qId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    mockQuestions[idx] = {
      ...mockQuestions[idx],
      ...body,
      updatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    return HttpResponse.json(mockQuestions[idx]);
  }),

  // PATCH /api/v1/admin/questions/:id/status
  http.patch(/\/api\/v1\/admin\/questions\/([^/]+)\/status$/, async ({ params, request }) => {
    const qId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as { status?: 'ACTIVE' | 'ARCHIVED' };
    const idx = mockQuestions.findIndex((q) => q.id === qId);

    if (idx === -1) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Question ${qId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    mockQuestions[idx].status = (body.status as 'ACTIVE' | 'ARCHIVED') || 'ARCHIVED';
    return HttpResponse.json({ success: true, question: mockQuestions[idx] });
  }),

  // ==========================================
  // ASSESSMENTS API (FR-ASMT-001..008)
  // ==========================================

  // GET /api/v1/admin/assessments
  http.get(/\/api\/v1\/admin\/assessments$/, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const roleCategory = url.searchParams.get('roleCategory') || '';
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    let list = [...mockAssessments];

    if (status && status !== 'ALL') {
      list = list.filter((a) => a.status === status);
    }
    if (roleCategory && roleCategory !== 'ALL') {
      list = list.filter((a) => a.roleCategory.toLowerCase().includes(roleCategory.toLowerCase()));
    }
    if (search) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(search) || a.roleCategory.toLowerCase().includes(search),
      );
    }

    return HttpResponse.json({
      assessments: list,
      total: list.length,
    });
  }),

  // GET /api/v1/admin/assessments/:id
  http.get(/\/api\/v1\/admin\/assessments\/([^/]+)$/, ({ params }) => {
    const asmtId = params[0] as string;
    const asmt = mockAssessments.find((a) => a.id === asmtId);

    if (!asmt) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Assessment ${asmtId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(asmt);
  }),

  // POST /api/v1/admin/assessments
  http.post(/\/api\/v1\/admin\/assessments$/, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const newAsmt = {
      id: `asmt-${Date.now().toString(36)}`,
      title: (body.title as string) || 'Untitled Assessment',
      description: (body.description as string) || null,
      instructions: (body.instructions as string) || null,
      roleCategory: (body.roleCategory as string) || 'Software Engineering',
      overallDuration: Number(body.overallDuration) || 60,
      totalMarks: Number(body.totalMarks) || 100,
      passingMarks: Number(body.passingMarks) || 40,
      negativeMarking: Boolean(body.negativeMarking),
      negativeMarkValue: Number(body.negativeMarkValue) || 0,
      randomizeQuestions: Boolean(body.randomizeQuestions),
      randomizeOptions: Boolean(body.randomizeOptions),
      navigationMode: (body.navigationMode as 'SEQUENTIAL' | 'FREE') || 'SEQUENTIAL',
      resultVisibility:
        (body.resultVisibility as 'IMMEDIATE' | 'SCHEDULED' | 'ADMIN_RELEASE') || 'ADMIN_RELEASE',
      startAt: (body.startAt as string) || new Date().toISOString(),
      endAt: (body.endAt as string) || new Date(Date.now() + 86400 * 1000).toISOString(),
      attemptLimit: Number(body.attemptLimit) || 1,
      status: 'DRAFT' as const,
      questionsCount: Array.isArray(body.questions) ? body.questions.length : 0,
      assignedCandidatesCount: 0,
      questions: Array.isArray(body.questions) ? body.questions : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAssessments.unshift(newAsmt as any);

    return HttpResponse.json(newAsmt, { status: 201 });
  }),

  // PUT /api/v1/admin/assessments/:id
  http.put(/\/api\/v1\/admin\/assessments\/([^/]+)$/, async ({ params, request }) => {
    const asmtId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const idx = mockAssessments.findIndex((a) => a.id === asmtId);

    if (idx === -1) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Assessment ${asmtId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    mockAssessments[idx] = {
      ...mockAssessments[idx],
      ...body,
      updatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    return HttpResponse.json(mockAssessments[idx]);
  }),

  // POST /api/v1/admin/assessments/:id/questions
  http.post(/\/api\/v1\/admin\/assessments\/([^/]+)\/questions$/, async ({ params, request }) => {
    const asmtId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as { questions?: Array<unknown> };
    const asmt = mockAssessments.find((a) => a.id === asmtId);

    if (!asmt) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Assessment ${asmtId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asmt.questions = (body.questions as any) || [];
    asmt.questionsCount = asmt.questions?.length || 0;

    return HttpResponse.json({ success: true, mappedCount: asmt.questionsCount });
  }),

  // POST /api/v1/admin/assessments/:id/publish
  http.post(/\/api\/v1\/admin\/assessments\/([^/]+)\/publish$/, ({ params }) => {
    const asmtId = params[0] as string;
    const asmt = mockAssessments.find((a) => a.id === asmtId);

    if (!asmt) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Assessment ${asmtId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    asmt.status = 'SCHEDULED';
    asmt.updatedAt = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      assessment: asmt,
      snapshotVersion: 1,
    });
  }),

  // PATCH /api/v1/admin/assessments/:id/status
  http.patch(/\/api\/v1\/admin\/assessments\/([^/]+)\/status$/, async ({ params, request }) => {
    const asmtId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as {
      status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'ARCHIVED';
    };
    const asmt = mockAssessments.find((a) => a.id === asmtId);

    if (!asmt) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Assessment ${asmtId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    if (body.status) {
      asmt.status = body.status as AssessmentStatus;
      mockAuditLogs.unshift({
        id: `aud-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        eventType: 'ASSESSMENT_STATUS',
        actorId: 'usr-admin-01',
        actorName: 'Dr. Ashlin Siddharth',
        actorRole: 'SUPER_ADMIN',
        entityType: 'assessment',
        entityId: asmtId,
        outcome: 'SUCCESS',
        reason: (request.headers.get('x-reason') as string) || `Status updated to ${body.status}`,
        correlationId: `cid-${Date.now().toString(36)}`,
        ipAddress: '127.0.0.1',
      });
    }

    return HttpResponse.json({ success: true, assessment: asmt });
  }),

  // ==========================================
  // LIVE SESSIONS & OVERRIDES (FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-004, BR-012)
  // ==========================================

  // GET /api/v1/admin/sessions
  http.get(/\/api\/v1\/admin\/sessions$/, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const assessmentId = url.searchParams.get('assessmentId') || '';
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    let filtered = [...mockLiveSessions];

    if (status && status !== 'ALL') {
      filtered = filtered.filter((s) => s.status === status);
    }
    if (assessmentId && assessmentId !== 'ALL') {
      filtered = filtered.filter((s) => s.assessmentId === assessmentId);
    }
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.candidateName.toLowerCase().includes(search) ||
          s.candidateIdentifier.toLowerCase().includes(search) ||
          s.candidateEmail.toLowerCase().includes(search) ||
          s.assessmentTitle.toLowerCase().includes(search),
      );
    }

    const activeCount = mockLiveSessions.filter((s) => s.status === 'ACTIVE').length;
    const interruptedCount = mockLiveSessions.filter((s) => s.status === 'INTERRUPTED').length;
    const submittedCount = mockLiveSessions.filter((s) => s.status === 'SUBMITTED').length;
    const expiredCount = mockLiveSessions.filter((s) => s.status === 'EXPIRED').length;
    const pausedCount = mockLiveSessions.filter((s) => s.status === 'PAUSED').length;

    return HttpResponse.json({
      sessions: filtered,
      total: filtered.length,
      activeCount,
      interruptedCount,
      submittedCount,
      expiredCount,
      pausedCount,
    });
  }),

  // GET /api/v1/admin/sessions/:id
  http.get(/\/api\/v1\/admin\/sessions\/([^/]+)$/, ({ params }) => {
    const sessionId = params[0] as string;
    const session = mockLiveSessions.find((s) => s.id === sessionId);

    if (!session) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Live session ${sessionId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(session);
  }),

  // POST /api/v1/admin/sessions/:id/override (BR-012, FR-ADMIN-004, Rule 7)
  http.post(/\/api\/v1\/admin\/sessions\/([^/]+)\/override$/, async ({ params, request }) => {
    const sessionId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as {
      overrideType?: SessionOverrideType;
      reason?: string;
      extensionMinutes?: number;
      notes?: string;
    };

    const session = mockLiveSessions.find((s) => s.id === sessionId);
    if (!session) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Session ${sessionId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    // BR-012 & Rule 7: Mandatory reason validation
    if (!body.reason || body.reason.trim().length === 0) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message:
            'Mandatory justification reason is required for administrative session override (BR-012, Rule 7).',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 422 },
      );
    }

    const correlationId = `cid-ovr-${Date.now().toString(36)}`;
    const extension = body.extensionMinutes || 15;

    switch (body.overrideType) {
      case 'EXTEND':
        session.overallRemainingSeconds += extension * 60;
        session.extensionMinutesApplied = (session.extensionMinutesApplied || 0) + extension;
        if (session.status === 'EXPIRED') session.status = 'ACTIVE';
        break;
      case 'REOPEN':
        session.status = 'ACTIVE';
        session.overallRemainingSeconds = Math.max(session.overallRemainingSeconds, extension * 60);
        break;
      case 'PAUSE':
        session.status = 'PAUSED';
        break;
      case 'RESUME':
        session.status = 'ACTIVE';
        break;
      case 'CANCEL':
        session.status = 'CANCELLED';
        break;
    }

    session.overrideReason = body.reason;
    session.notes = body.notes;

    // Create Audit Log Entry (Rule 7, FR-ADMIN-007)
    const auditEntry: AuditLogEntry = {
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      eventType: 'SESSION_OVERRIDE',
      actorId: 'usr-admin-01',
      actorName: 'Dr. Ashlin Siddharth',
      actorRole: 'SUPER_ADMIN',
      entityType: 'session',
      entityId: session.id,
      outcome: 'SUCCESS',
      reason: body.reason,
      correlationId,
      ipAddress: '127.0.0.1',
      metadata: {
        overrideType: body.overrideType,
        extensionMinutes: body.extensionMinutes,
        candidateIdentifier: session.candidateIdentifier,
        candidateName: session.candidateName,
      },
    };
    mockAuditLogs.unshift(auditEntry);

    // Create Incident Record for SRS 11.4 Roles (FR-ADMIN-008)
    const incident: IncidentRecord = {
      id: `inc-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      assessmentId: session.assessmentId,
      assessmentTitle: session.assessmentTitle,
      candidateId: session.candidateId,
      candidateIdentifier: session.candidateIdentifier,
      candidateName: session.candidateName,
      title: `Admin Override: ${body.overrideType} (${session.candidateName})`,
      description: body.reason,
      severity: body.overrideType === 'CANCEL' ? 'HIGH' : 'MEDIUM',
      overrideAction: body.overrideType,
      actor: 'Dr. Ashlin Siddharth (Super Admin)',
      resolutionNotes: body.notes || 'Resolved via Admin Console Override Workflow.',
      correlationId,
    };
    mockIncidents.unshift(incident);

    return HttpResponse.json({
      success: true,
      session,
      auditLogId: auditEntry.id,
      correlationId,
      message: `Override ${body.overrideType} applied successfully.`,
    });
  }),

  // ==========================================
  // AUDIT LOGS & INCIDENTS (FR-ADMIN-007, FR-ADMIN-008, SRS 11.4)
  // ==========================================

  // GET /api/v1/admin/audit-logs
  http.get(/\/api\/v1\/admin\/audit-logs$/, ({ request }) => {
    const url = new URL(request.url);
    const eventType = url.searchParams.get('eventType') || '';
    const actor = url.searchParams.get('actor')?.toLowerCase() || '';
    const entityType = url.searchParams.get('entityType') || '';
    const outcome = url.searchParams.get('outcome') || '';
    const correlationId = url.searchParams.get('correlationId')?.toLowerCase() || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    let filtered = [...mockAuditLogs];

    if (eventType && eventType !== 'ALL') {
      filtered = filtered.filter((a) => a.eventType === eventType);
    }
    if (actor) {
      filtered = filtered.filter(
        (a) => a.actorName.toLowerCase().includes(actor) || a.actorId.toLowerCase().includes(actor),
      );
    }
    if (entityType && entityType !== 'ALL') {
      filtered = filtered.filter((a) => a.entityType === entityType);
    }
    if (outcome && outcome !== 'ALL') {
      filtered = filtered.filter((a) => a.outcome === outcome);
    }
    if (correlationId) {
      filtered = filtered.filter((a) => a.correlationId.toLowerCase().includes(correlationId));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return HttpResponse.json({
      entries: paginated,
      total,
      page,
      limit,
      totalPages,
    });
  }),

  // GET /api/v1/admin/incidents
  http.get(/\/api\/v1\/admin\/incidents$/, () => {
    return HttpResponse.json(mockIncidents);
  }),

  // ==========================================
  // RESULTS & SCORING API (FR-SCORE-001..010, FR-ADMIN-005, FR-ADMIN-006, UC-14, UC-15)
  // ==========================================

  // GET /api/v1/admin/results
  http.get(/\/api\/v1\/admin\/results$/, ({ request }) => {
    const url = new URL(request.url);
    const assessmentId = url.searchParams.get('assessmentId') || '';
    const status = url.searchParams.get('status') || '';
    const passFail = url.searchParams.get('passFail') || '';
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);

    let filtered = [...mockResults];

    if (assessmentId && assessmentId !== 'ALL') {
      filtered = filtered.filter((r) => r.assessmentId === assessmentId);
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (passFail && passFail !== 'ALL') {
      filtered = filtered.filter((r) => r.passFailStatus === passFail);
    }
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.candidateName.toLowerCase().includes(search) ||
          r.candidateIdentifier.toLowerCase().includes(search) ||
          r.candidateEmail.toLowerCase().includes(search) ||
          r.assessmentTitle.toLowerCase().includes(search),
      );
    }
    if (startDate) {
      filtered = filtered.filter((r) => new Date(r.completedOn) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((r) => new Date(r.completedOn) <= new Date(endDate));
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return HttpResponse.json({
      results: paginated,
      total,
      page,
      limit,
      totalPages,
    });
  }),

  // GET /api/v1/admin/results/:id
  http.get(/\/api\/v1\/admin\/results\/([^/]+)$/, ({ params }) => {
    const resultId = params[0] as string;
    const result = mockResults.find((r) => r.id === resultId);

    if (!result) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Result ${resultId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(result);
  }),

  // POST /api/v1/admin/results/:id/correct (FR-SCORE-010, BR-012, Rule 7, UC-15)
  http.post(/\/api\/v1\/admin\/results\/([^/]+)\/correct$/, async ({ params, request }) => {
    const resultId = params[0] as string;
    const body = (await request.json().catch(() => ({}))) as ScoreCorrectionPayload;

    const result = mockResults.find((r) => r.id === resultId);
    if (!result) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.NOT_ELIGIBLE,
          message: `Result ${resultId} not found.`,
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 404 },
      );
    }

    // BR-012 & Rule 7: Mandatory reason validation
    if (!body.reason || body.reason.trim().length === 0) {
      return HttpResponse.json(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message:
            'Mandatory justification reason is required for administrative score correction (BR-012, Rule 7, UC-15).',
          correlationId: `cid-${Date.now().toString(36)}`,
        },
        { status: 422 },
      );
    }

    const correlationId = `cid-corr-${Date.now().toString(36)}`;
    let originalScore = result.totalScore;
    let questionTitle: string | undefined = undefined;

    if (body.questionId) {
      const question = result.questions.find((q) => q.questionId === body.questionId);
      if (question) {
        originalScore = question.marksAwarded;
        questionTitle = question.questionTitle;
        question.marksAwarded = body.newScore;
        question.evaluationStatus = 'CORRECTED';
        // Recalculate total score
        result.totalScore = result.questions.reduce((sum, q) => sum + q.marksAwarded, 0);
      } else {
        result.totalScore = body.newScore;
      }
    } else {
      result.totalScore = body.newScore;
    }

    result.scorePercentage = Math.round((result.totalScore / result.maxScore) * 100);
    result.passFailStatus =
      result.scorePercentage >= result.passingScorePercentage ? 'PASS' : 'FAIL';

    const correctionEntry = {
      id: `corr-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      questionId: body.questionId || null,
      questionTitle,
      originalScore,
      revisedScore: body.newScore,
      reason: body.reason,
      adminId: 'usr-admin-01',
      adminName: 'Dr. Ashlin Siddharth (Super Admin)',
      correlationId,
    };

    result.corrections.unshift(correctionEntry);

    // Create Audit Log Entry (Rule 7, FR-SCORE-010)
    mockAuditLogs.unshift({
      id: `aud-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      eventType: 'SCORE_CORRECTION',
      actorId: 'usr-admin-01',
      actorName: 'Dr. Ashlin Siddharth',
      actorRole: 'SUPER_ADMIN',
      entityType: 'result',
      entityId: result.id,
      outcome: 'SUCCESS',
      reason: body.reason,
      correlationId,
      ipAddress: '127.0.0.1',
      metadata: {
        candidateIdentifier: result.candidateIdentifier,
        originalScore,
        revisedScore: body.newScore,
        newTotal: result.totalScore,
      },
    });

    return HttpResponse.json({
      success: true,
      result,
      correction: correctionEntry,
      correlationId,
      message: 'Score corrected successfully with durable audit entry.',
    });
  }),

  // ==========================================
  // MANUAL EVALUATION QUEUE API (UC-14, FR-SCORE-004, FR-SCORE-005)
  // ==========================================

  // GET /api/v1/admin/evaluation-queue
  http.get(/\/api\/v1\/admin\/evaluation-queue$/, ({ request }) => {
    const url = new URL(request.url);
    const assessmentId = url.searchParams.get('assessmentId') || '';

    let queue = [...mockEvaluationQueue];
    if (assessmentId && assessmentId !== 'ALL') {
      queue = queue.filter((item) => item.assessmentId === assessmentId);
    }

    return HttpResponse.json(queue);
  }),

  // POST /api/v1/admin/evaluation-queue/:id/evaluate (UC-14, FR-SCORE-004, FR-SCORE-005, FR-SCORE-008)
  http.post(
    /\/api\/v1\/admin\/evaluation-queue\/([^/]+)\/evaluate$/,
    async ({ params, request }) => {
      const queueItemId = params[0] as string;
      const body = (await request.json().catch(() => ({}))) as {
        awardedMarks?: number;
        rubricScores?: Record<string, number>;
        comments?: string;
      };

      const queueIndex = mockEvaluationQueue.findIndex((item) => item.id === queueItemId);
      if (queueIndex === -1) {
        return HttpResponse.json(
          {
            code: ApiErrorCode.NOT_ELIGIBLE,
            message: `Evaluation queue item ${queueItemId} not found.`,
            correlationId: `cid-${Date.now().toString(36)}`,
          },
          { status: 404 },
        );
      }

      const queueItem = mockEvaluationQueue[queueIndex];
      const awardedMarks = typeof body.awardedMarks === 'number' ? body.awardedMarks : 0;
      const correlationId = `cid-eval-${Date.now().toString(36)}`;

      // Update corresponding result
      const result = mockResults.find((r) => r.id === queueItem.resultId);
      if (result) {
        const question = result.questions.find((q) => q.questionId === queueItem.questionId);
        if (question) {
          question.marksAwarded = awardedMarks;
          question.evaluationStatus = 'EVALUATED';
          question.evaluatorComments = body.comments || '';
          question.evaluatorName = 'Technical Evaluator';
          question.evaluatedAt = new Date().toISOString();
        }

        // Recalculate total score
        result.totalScore = result.questions.reduce((sum, q) => sum + q.marksAwarded, 0);
        result.scorePercentage = Math.round((result.totalScore / result.maxScore) * 100);
        result.passFailStatus =
          result.scorePercentage >= result.passingScorePercentage ? 'PASS' : 'FAIL';
        result.pendingManualCount = Math.max(0, result.pendingManualCount - 1);

        // FR-SCORE-008: Once all manual questions are evaluated, status becomes FINAL
        if (result.pendingManualCount === 0) {
          result.status = 'FINAL';
        }
      }

      // Remove from queue
      mockEvaluationQueue.splice(queueIndex, 1);

      return HttpResponse.json({
        success: true,
        resultId: queueItem.resultId,
        resultStatus: result?.status || 'FINAL',
        updatedMarks: result?.totalScore || awardedMarks,
        correlationId,
        message: 'Evaluation submitted successfully and result updated.',
      });
    },
  ),

  // ==========================================
  // REPORTS & ANALYTICS API (FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-009)
  // ==========================================

  // GET /api/v1/admin/reports/:assessmentId/summary
  http.get(/\/api\/v1\/admin\/reports\/([^/]+)\/summary$/, ({ params }) => {
    const assessmentId = params[0] as string;
    const assessment = mockAssessments.find((a) => a.id === assessmentId) || mockAssessments[0];
    const results = mockResults.filter((r) => r.assessmentId === assessment.id);
    const effectiveResults = results.length > 0 ? results : mockResults.slice(0, 5);

    const totalCompleted = effectiveResults.length;
    const avgScore =
      totalCompleted > 0
        ? Math.round(effectiveResults.reduce((s, r) => s + r.scorePercentage, 0) / totalCompleted)
        : 72;
    const passCount = effectiveResults.filter((r) => r.passFailStatus === 'PASS').length;
    const passRate = totalCompleted > 0 ? Math.round((passCount / totalCompleted) * 100) : 75;
    const highest =
      totalCompleted > 0 ? Math.max(...effectiveResults.map((r) => r.scorePercentage)) : 92;
    const lowest =
      totalCompleted > 0 ? Math.min(...effectiveResults.map((r) => r.scorePercentage)) : 48;
    const avgTime =
      totalCompleted > 0
        ? Math.round(effectiveResults.reduce((s, r) => s + r.timeTakenMinutes, 0) / totalCompleted)
        : 48;

    const report: AssessmentSummaryReport = {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      totalCompleted,
      averageScorePercentage: avgScore,
      passRatePercentage: passRate,
      highestScorePercentage: highest,
      lowestScorePercentage: lowest,
      averageTimeTakenMinutes: avgTime,
      passingThresholdPercentage: 60,
    };

    return HttpResponse.json(report);
  }),

  // GET /api/v1/admin/reports/:assessmentId/rankings (FR-SCORE-009)
  http.get(/\/api\/v1\/admin\/reports\/([^/]+)\/rankings$/, ({ params }) => {
    const assessmentId = params[0] as string;
    const results = mockResults.filter((r) => r.assessmentId === assessmentId);
    const effective = results.length > 0 ? results : mockResults;

    // FR-SCORE-009: Deterministic tie-breaking rules:
    // 1. Score percentage descending
    // 2. Time taken ascending (faster completion ranks higher)
    // 3. Alphanumeric candidate identifier ascending
    const sorted = [...effective].sort((a, b) => {
      if (b.scorePercentage !== a.scorePercentage) {
        return b.scorePercentage - a.scorePercentage;
      }
      if (a.timeTakenMinutes !== b.timeTakenMinutes) {
        return a.timeTakenMinutes - b.timeTakenMinutes;
      }
      return a.candidateIdentifier.localeCompare(b.candidateIdentifier);
    });

    const rankings: CandidateRankingItem[] = sorted.map((r, index) => ({
      rank: index + 1,
      candidateId: r.candidateId,
      candidateIdentifier: r.candidateIdentifier,
      candidateName: r.candidateName,
      scorePercentage: r.scorePercentage,
      totalScore: r.totalScore,
      maxScore: r.maxScore,
      passFailStatus: r.passFailStatus,
      timeTakenMinutes: r.timeTakenMinutes,
      completedOn: r.completedOn,
    }));

    return HttpResponse.json(rankings);
  }),

  // GET /api/v1/admin/reports/:assessmentId/question-stats (FR-ADMIN-006)
  http.get(/\/api\/v1\/admin\/reports\/([^/]+)\/question-stats$/, () => {
    const stats: QuestionPerformanceStats[] = [
      {
        questionId: 'q-101',
        title: 'AVL Tree Search Time Complexity',
        type: 'MCQ_SINGLE',
        correctAnswerRate: 85,
        averageScore: 1.7,
        maxScore: 2,
        difficultyIndex: 'EASY',
        discriminationIndex: 0.42,
        responseDistribution: [
          { optionKey: 'A', optionLabel: 'O(1)', count: 4, percentage: 5, isCorrect: false },
          { optionKey: 'B', optionLabel: 'O(log N)', count: 68, percentage: 85, isCorrect: true },
          { optionKey: 'C', optionLabel: 'O(N)', count: 6, percentage: 7.5, isCorrect: false },
          {
            optionKey: 'D',
            optionLabel: 'O(N log N)',
            count: 2,
            percentage: 2.5,
            isCorrect: false,
          },
        ],
      },
      {
        questionId: 'q-102',
        title: 'O(N log N) Sorting Algorithms Multi-Select',
        type: 'MCQ_MULTIPLE',
        correctAnswerRate: 64,
        averageScore: 2.56,
        maxScore: 4,
        difficultyIndex: 'MEDIUM',
        discriminationIndex: 0.58,
        responseDistribution: [
          { optionKey: 'A', optionLabel: 'Merge Sort', count: 72, percentage: 90, isCorrect: true },
          { optionKey: 'B', optionLabel: 'Quick Sort', count: 65, percentage: 81, isCorrect: true },
          {
            optionKey: 'C',
            optionLabel: 'Bubble Sort',
            count: 8,
            percentage: 10,
            isCorrect: false,
          },
          {
            optionKey: 'D',
            optionLabel: 'Insertion Sort',
            count: 12,
            percentage: 15,
            isCorrect: false,
          },
        ],
      },
      {
        questionId: 'q-104',
        title: 'Two Sum Problem (Coding Challenge)',
        type: 'CODING',
        correctAnswerRate: 72,
        averageScore: 17.2,
        maxScore: 24,
        difficultyIndex: 'MEDIUM',
        discriminationIndex: 0.65,
      },
      {
        questionId: 'q-106',
        title: 'Optimistic vs Pessimistic Concurrency',
        type: 'DESCRIPTIVE',
        correctAnswerRate: 58,
        averageScore: 2.9,
        maxScore: 5,
        difficultyIndex: 'HARD',
        discriminationIndex: 0.71,
      },
    ];

    return HttpResponse.json(stats);
  }),
];

// ==========================================
// In-Memory Seed State for MSW Mocks
// ==========================================

const mockCandidates: CandidateRecord[] = [
  {
    id: 'can-1',
    candidateIdentifier: 'CAN-2026-001',
    fullName: 'Rohan Mehta',
    username: 'rohan.mehta',
    email: 'rohan.mehta@nitk.edu.in',
    phone: '+91 9876543210',
    institution: 'National Institute of Technology Karnataka',
    qualification: 'B.Tech Computer Science',
    graduationYear: 2026,
    recruitmentReference: 'Autumn Campus 2026',
    accountStatus: 'ACTIVE' as const,
    testsAssignedCount: 2,
    createdAt: '2026-10-15T09:30:00Z',
    updatedAt: '2026-10-15T09:30:00Z',
  },
  {
    id: 'can-2',
    candidateIdentifier: 'CAN-2026-002',
    fullName: 'Aisha Khan',
    username: 'aisha.khan',
    email: 'aisha.khan@iitb.ac.in',
    phone: '+91 9811223344',
    institution: 'Indian Institute of Technology Bombay',
    qualification: 'B.Tech Electrical & CS',
    graduationYear: 2026,
    recruitmentReference: 'Autumn Campus 2026',
    accountStatus: 'ACTIVE' as const,
    testsAssignedCount: 1,
    createdAt: '2026-10-16T10:15:00Z',
    updatedAt: '2026-10-16T10:15:00Z',
  },
  {
    id: 'can-3',
    candidateIdentifier: 'CAN-2026-003',
    fullName: 'Priya Sharma',
    username: 'priya.sharma',
    email: 'priya.sharma@bits-pilani.ac.in',
    phone: '+91 9722334455',
    institution: 'BITS Pilani',
    qualification: 'B.E. Information Systems',
    graduationYear: 2026,
    recruitmentReference: 'Autumn Campus 2026',
    accountStatus: 'ACTIVE' as const,
    testsAssignedCount: 3,
    createdAt: '2026-10-17T11:45:00Z',
    updatedAt: '2026-10-17T11:45:00Z',
  },
  {
    id: 'can-4',
    candidateIdentifier: 'CAN-2026-004',
    fullName: 'Vikram Patel',
    username: 'vikram.patel',
    email: 'vikram.patel@iiit.ac.in',
    phone: '+91 9633445566',
    institution: 'IIIT Hyderabad',
    qualification: 'B.Tech CSE',
    graduationYear: 2026,
    recruitmentReference: 'Lateral Drive 2026',
    accountStatus: 'INACTIVE' as const,
    testsAssignedCount: 0,
    createdAt: '2026-10-18T14:20:00Z',
    updatedAt: '2026-10-18T14:20:00Z',
  },
  {
    id: 'can-5',
    candidateIdentifier: 'CAN-2026-005',
    fullName: 'Ananya Reddy',
    username: 'ananya.reddy',
    email: 'ananya.reddy@dtu.ac.in',
    phone: '+91 9544556677',
    institution: 'Delhi Technological University',
    qualification: 'B.Tech Software Engineering',
    graduationYear: 2026,
    recruitmentReference: 'Autumn Campus 2026',
    accountStatus: 'ACTIVE' as const,
    testsAssignedCount: 1,
    createdAt: '2026-10-19T16:00:00Z',
    updatedAt: '2026-10-19T16:00:00Z',
  },
  {
    id: 'can-6',
    candidateIdentifier: 'CAN-2026-006',
    fullName: 'Suresh Nair',
    username: 'suresh.nair',
    email: 'suresh.nair@coep.ac.in',
    phone: '+91 9455667788',
    institution: 'COEP Technological University',
    qualification: 'B.Tech IT',
    graduationYear: 2025,
    recruitmentReference: 'Lateral Drive 2026',
    accountStatus: 'LOCKED' as const,
    testsAssignedCount: 0,
    createdAt: '2026-10-20T08:50:00Z',
    updatedAt: '2026-10-20T08:50:00Z',
  },
  {
    id: 'can-7',
    candidateIdentifier: 'CAN-2026-007',
    fullName: 'Divya Iyer',
    username: 'divya.iyer',
    email: 'divya.iyer@annauniv.edu',
    phone: '+91 9366778899',
    institution: 'Anna University',
    qualification: 'B.Tech Computer Science',
    graduationYear: 2026,
    recruitmentReference: 'Autumn Campus 2026',
    accountStatus: 'ACTIVE' as const,
    testsAssignedCount: 1,
    createdAt: '2026-10-21T12:00:00Z',
    updatedAt: '2026-10-21T12:00:00Z',
  },
];

const mockQuestions: QuestionRecord[] = [
  {
    id: 'q-101',
    questionType: 'MCQ_SINGLE' as const,
    questionText:
      'What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL tree)?',
    codeSnippet: null,
    topic: 'Data Structures',
    difficulty: 'Easy' as const,
    maximumMarks: 2,
    negativeMarks: 0.5,
    explanation: 'A balanced binary search tree maintains logarithmic height O(log N).',
    status: 'ACTIVE' as const,
    options: [
      { id: 'opt-1', optionText: 'O(1)', displayOrder: 1, isCorrect: false },
      { id: 'opt-2', optionText: 'O(log N)', displayOrder: 2, isCorrect: true },
      { id: 'opt-3', optionText: 'O(N)', displayOrder: 3, isCorrect: false },
      { id: 'opt-4', optionText: 'O(N log N)', displayOrder: 4, isCorrect: false },
    ],
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'q-102',
    questionType: 'MCQ_MULTIPLE' as const,
    questionText:
      'Which of the following sorting algorithms provide an average time complexity of O(N log N)? (Select all that apply)',
    codeSnippet: null,
    topic: 'Algorithms',
    difficulty: 'Medium' as const,
    maximumMarks: 4,
    negativeMarks: 1,
    explanation: 'Merge Sort and Quick Sort both offer O(N log N) average complexity.',
    status: 'ACTIVE' as const,
    options: [
      { id: 'opt-5', optionText: 'Merge Sort', displayOrder: 1, isCorrect: true },
      { id: 'opt-6', optionText: 'Quick Sort', displayOrder: 2, isCorrect: true },
      { id: 'opt-7', optionText: 'Bubble Sort', displayOrder: 3, isCorrect: false },
      { id: 'opt-8', optionText: 'Insertion Sort', displayOrder: 4, isCorrect: false },
    ],
    createdAt: '2026-10-11T11:00:00Z',
    updatedAt: '2026-10-11T11:00:00Z',
  },
  {
    id: 'q-103',
    questionType: 'TRUE_FALSE' as const,
    questionText: 'HTTP/2 supports request multiplexing over a single TCP connection.',
    codeSnippet: null,
    topic: 'Networking',
    difficulty: 'Easy' as const,
    maximumMarks: 1,
    negativeMarks: 0,
    explanation:
      'HTTP/2 introduces binary framing and stream multiplexing over a single connection.',
    status: 'ACTIVE' as const,
    options: [
      { id: 'opt-9', optionText: 'True', displayOrder: 1, isCorrect: true },
      { id: 'opt-10', optionText: 'False', displayOrder: 2, isCorrect: false },
    ],
    createdAt: '2026-10-12T12:00:00Z',
    updatedAt: '2026-10-12T12:00:00Z',
  },
  {
    id: 'q-104',
    questionType: 'SHORT_ANSWER' as const,
    questionText:
      'What HTTP status code is used for requesting client upgrade or rejecting outdated client versions in strict protocol checks?',
    codeSnippet: null,
    topic: 'Web Protocols',
    difficulty: 'Medium' as const,
    maximumMarks: 3,
    negativeMarks: 0,
    explanation: 'HTTP 426 Upgrade Required (SRS FR-LAB-003).',
    status: 'ACTIVE' as const,
    options: [],
    createdAt: '2026-10-13T13:00:00Z',
    updatedAt: '2026-10-13T13:00:00Z',
  },
  {
    id: 'q-105',
    questionType: 'SCENARIO' as const,
    questionText:
      'A banking application receives duplicate POST requests during temporary network timeout. Design an idempotency strategy that avoids duplicate debit transactions.',
    codeSnippet: null,
    topic: 'System Design',
    difficulty: 'Hard' as const,
    maximumMarks: 10,
    negativeMarks: 0,
    explanation:
      'Evaluate idempotency key deduplication with durable distributed lock or unique constraint.',
    status: 'ACTIVE' as const,
    options: [],
    createdAt: '2026-10-14T14:00:00Z',
    updatedAt: '2026-10-14T14:00:00Z',
  },
  {
    id: 'q-106',
    questionType: 'DESCRIPTIVE' as const,
    questionText:
      'Explain the difference between optimistic concurrency control and pessimistic concurrency control in database transactions.',
    codeSnippet: null,
    topic: 'Databases',
    difficulty: 'Medium' as const,
    maximumMarks: 5,
    negativeMarks: 0,
    explanation:
      'Optimistic checks on commit using version/timestamp, pessimistic acquires locks upfront.',
    status: 'ACTIVE' as const,
    options: [],
    createdAt: '2026-10-15T15:00:00Z',
    updatedAt: '2026-10-15T15:00:00Z',
  },
];

const mockAssessments: AssessmentRecord[] = [
  {
    id: 'asmt-01',
    title: 'Frontend Developer Test',
    description: 'Comprehensive screening for React, JavaScript ES6+, and CSS layout proficiency.',
    instructions:
      'Complete all questions sequentially. Once submitted, answers cannot be modified.',
    roleCategory: 'Frontend Engineering',
    overallDuration: 60,
    totalMarks: 50,
    passingMarks: 30,
    negativeMarking: true,
    negativeMarkValue: 0.5,
    randomizeQuestions: true,
    randomizeOptions: true,
    navigationMode: 'SEQUENTIAL' as const,
    resultVisibility: 'ADMIN_RELEASE' as const,
    startAt: '2026-10-24T10:00:00Z',
    endAt: '2026-10-24T12:00:00Z',
    attemptLimit: 1,
    status: 'SCHEDULED' as const,
    questionsCount: 4,
    assignedCandidatesCount: 24,
    questions: [
      { questionId: 'q-101', sequenceNumber: 1, timeLimitSeconds: 60, marksOverride: 2 },
      { questionId: 'q-102', sequenceNumber: 2, timeLimitSeconds: 120, marksOverride: 4 },
      { questionId: 'q-103', sequenceNumber: 3, timeLimitSeconds: 45, marksOverride: 1 },
      { questionId: 'q-104', sequenceNumber: 4, timeLimitSeconds: 90, marksOverride: 3 },
    ],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'asmt-02',
    title: 'Data Analyst Assessment',
    description: 'Evaluation of SQL queries, relational modeling, and analytical problem-solving.',
    instructions: 'Each question has an individual timer. Auto-advances upon timeout.',
    roleCategory: 'Data & Analytics',
    overallDuration: 90,
    totalMarks: 75,
    passingMarks: 45,
    negativeMarking: false,
    negativeMarkValue: 0,
    randomizeQuestions: false,
    randomizeOptions: false,
    navigationMode: 'SEQUENTIAL' as const,
    resultVisibility: 'SCHEDULED' as const,
    startAt: '2026-10-25T14:00:00Z',
    endAt: '2026-10-25T17:00:00Z',
    attemptLimit: 1,
    status: 'ACTIVE' as const,
    questionsCount: 5,
    assignedCandidatesCount: 18,
    questions: [],
    createdAt: '2026-10-19T11:00:00Z',
    updatedAt: '2026-10-19T11:00:00Z',
  },
  {
    id: 'asmt-03',
    title: 'Full Stack Engineering Assessment',
    description:
      'Full stack assessment covering backend API design, system architecture, and client logic.',
    instructions: 'Free navigation enabled. Review all answers before final submission.',
    roleCategory: 'Software Engineering',
    overallDuration: 120,
    totalMarks: 100,
    passingMarks: 60,
    negativeMarking: true,
    negativeMarkValue: 1,
    randomizeQuestions: true,
    randomizeOptions: false,
    navigationMode: 'FREE' as const,
    resultVisibility: 'IMMEDIATE' as const,
    startAt: '2026-10-30T09:00:00Z',
    endAt: '2026-10-30T13:00:00Z',
    attemptLimit: 1,
    status: 'DRAFT' as const,
    questionsCount: 6,
    assignedCandidatesCount: 0,
    questions: [],
    createdAt: '2026-10-20T12:00:00Z',
    updatedAt: '2026-10-20T12:00:00Z',
  },
];

const mockLiveSessions: LiveSessionRecord[] = [
  {
    id: 'sess-1',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-1',
    candidateIdentifier: 'CAN-2026-001',
    candidateName: 'Rohan Mehta',
    candidateEmail: 'rohan.mehta@nitk.edu.in',
    status: 'ACTIVE',
    currentQuestionIndex: 2,
    totalQuestions: 4,
    currentQuestionId: 'q-102',
    startedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    lastHeartbeatAt: new Date(Date.now() - 5 * 1000).toISOString(),
    overallRemainingSeconds: 2280, // 38 mins
    questionRemainingSeconds: 75,
    clientIp: '192.168.1.105',
    clientVersion: '1.2.0',
  },
  {
    id: 'sess-2',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-2',
    candidateIdentifier: 'CAN-2026-002',
    candidateName: 'Aisha Khan',
    candidateEmail: 'aisha.khan@iitb.ac.in',
    status: 'INTERRUPTED',
    currentQuestionIndex: 3,
    totalQuestions: 4,
    currentQuestionId: 'q-103',
    startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    lastHeartbeatAt: new Date(Date.now() - 120 * 1000).toISOString(), // 2 mins ago (interrupted)
    overallRemainingSeconds: 1500, // 25 mins
    questionRemainingSeconds: 30,
    clientIp: '192.168.1.106',
    clientVersion: '1.2.0',
    notes: 'Lab terminal network cable disconnected; candidate seeking reconnection.',
  },
  {
    id: 'sess-3',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-3',
    candidateIdentifier: 'CAN-2026-003',
    candidateName: 'Priya Sharma',
    candidateEmail: 'priya.sharma@bits-pilani.ac.in',
    status: 'SUBMITTED',
    currentQuestionIndex: 4,
    totalQuestions: 4,
    startedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    lastHeartbeatAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    overallRemainingSeconds: 0,
    questionRemainingSeconds: 0,
    clientIp: '192.168.1.107',
    clientVersion: '1.2.0',
  },
  {
    id: 'sess-4',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-4',
    candidateIdentifier: 'CAN-2026-004',
    candidateName: 'Vikram Patel',
    candidateEmail: 'vikram.patel@iiit.ac.in',
    status: 'EXPIRED',
    currentQuestionIndex: 2,
    totalQuestions: 4,
    startedAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    lastHeartbeatAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    overallRemainingSeconds: 0,
    questionRemainingSeconds: 0,
    clientIp: '192.168.1.108',
    clientVersion: '1.2.0',
  },
  {
    id: 'sess-5',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-6',
    candidateIdentifier: 'CAN-2026-006',
    candidateName: 'Suresh Nair',
    candidateEmail: 'suresh.nair@coep.ac.in',
    status: 'PAUSED',
    currentQuestionIndex: 1,
    totalQuestions: 4,
    startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    lastHeartbeatAt: new Date(Date.now() - 20 * 1000).toISOString(),
    overallRemainingSeconds: 3120, // 52 mins
    questionRemainingSeconds: 40,
    clientIp: '192.168.1.109',
    clientVersion: '1.2.0',
    overrideReason: 'Lab 3 power interruption; timer held administratively.',
  },
];

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'aud-001',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    eventType: 'SESSION_OVERRIDE',
    actorId: 'usr-admin-01',
    actorName: 'Dr. Ashlin Siddharth',
    actorRole: 'SUPER_ADMIN',
    entityType: 'session',
    entityId: 'sess-5',
    outcome: 'SUCCESS',
    reason: 'Lab 3 power interruption; timer held administratively (BR-012).',
    correlationId: 'cid-init-ovr-01',
    ipAddress: '127.0.0.1',
    metadata: { overrideType: 'PAUSE', candidateIdentifier: 'CAN-2026-006' },
  },
  {
    id: 'aud-002',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    eventType: 'ASSESSMENT_PUBLISH',
    actorId: 'usr-admin-01',
    actorName: 'Dr. Ashlin Siddharth',
    actorRole: 'SUPER_ADMIN',
    entityType: 'assessment',
    entityId: 'asmt-01',
    outcome: 'SUCCESS',
    reason: 'Frozen immutable version snapshot for live candidate delivery.',
    correlationId: 'cid-pub-asmt-01',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'aud-003',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    eventType: 'SESSION_START',
    actorId: 'can-1',
    actorName: 'Rohan Mehta',
    actorRole: 'CANDIDATE',
    entityType: 'session',
    entityId: 'sess-1',
    outcome: 'SUCCESS',
    reason: 'Candidate launched assessment from lab terminal LAB-B-14.',
    correlationId: 'cid-start-sess-01',
    ipAddress: '192.168.1.105',
  },
  {
    id: 'aud-004',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    eventType: 'PASSWORD_RESET',
    actorId: 'usr-admin-01',
    actorName: 'Dr. Ashlin Siddharth',
    actorRole: 'SUPER_ADMIN',
    entityType: 'candidate',
    entityId: 'can-4',
    outcome: 'SUCCESS',
    reason: 'Candidate forgot credentials prior to campus recruitment window.',
    correlationId: 'cid-reset-pw-can-04',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'aud-005',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    eventType: 'SECURITY_ALERT',
    actorId: 'sys-watcher',
    actorName: 'VeriSync Security Engine',
    actorRole: 'SYSTEM',
    entityType: 'session',
    entityId: 'sess-2',
    outcome: 'BLOCKED',
    reason: 'Simultaneous duplicate session attempt rejected from IP 192.168.1.199 (TC-15).',
    correlationId: 'cid-sec-alert-dup-01',
    ipAddress: '192.168.1.199',
  },
];

const mockIncidents: IncidentRecord[] = [
  {
    id: 'inc-001',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    sessionId: 'sess-5',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-6',
    candidateIdentifier: 'CAN-2026-006',
    candidateName: 'Suresh Nair',
    title: 'Admin Override: PAUSE (Suresh Nair)',
    description: 'Lab 3 power interruption; timer held administratively.',
    severity: 'MEDIUM',
    overrideAction: 'PAUSE',
    actor: 'Dr. Ashlin Siddharth (Super Admin)',
    resolutionNotes: 'Timer held. Waiting for lab electrical engineer confirmation.',
    correlationId: 'cid-init-ovr-01',
  },
  {
    id: 'inc-002',
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    sessionId: 'sess-2',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    candidateId: 'can-2',
    candidateIdentifier: 'CAN-2026-002',
    candidateName: 'Aisha Khan',
    title: 'Session Interruption: Missed Heartbeats (Aisha Khan)',
    description: 'Candidate terminal lost network connectivity at 192.168.1.106.',
    severity: 'HIGH',
    actor: 'VeriSync Expiry Worker',
    resolutionNotes:
      'Terminal network cable re-plugged. Candidate awaiting REOPEN or RESUME override.',
    correlationId: 'cid-heartbeat-timeout-02',
  },
];

const mockEvaluationQueue: EvaluationQueueItem[] = [
  {
    id: 'eval-1',
    resultId: 'res-6',
    sessionId: 'sess-6',
    candidateId: 'can-5',
    candidateIdentifier: 'CAN-2026-005',
    candidateName: 'Ananya Reddy',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    questionId: 'q-106',
    questionTitle: 'Optimistic vs Pessimistic Concurrency',
    questionPrompt:
      'Explain the difference between optimistic concurrency control and pessimistic concurrency control in database transactions and describe a production scenario where optimistic locking is preferred.',
    questionType: 'DESCRIPTIVE',
    candidateAnswer:
      'Optimistic Concurrency Control (OCC) assumes conflicts are rare. Read and write operations proceed without acquiring exclusive database locks. Before committing, the transaction verifies whether another transaction has modified the data (typically via a version number or timestamp column). If a conflict is detected, the transaction rolls back or retries.\n\nPessimistic Concurrency Control acquires locks upfront (e.g., SELECT FOR UPDATE), blocking any concurrent transactions from modifying the record until the holding transaction completes.\n\nA classic scenario where OCC is preferred is a high-traffic e-commerce shopping cart or hotel room reservation browsing interface where read throughput dominates and contention on specific records is low.',
    submittedAt: '2026-10-25T11:00:00Z',
    maxMarks: 5,
    rubricCriteria: [
      {
        id: 'rub-1',
        name: 'Core Concept Definition',
        description: 'Accurately defines locking vs version checking principles',
        maxMarks: 2,
      },
      {
        id: 'rub-2',
        name: 'Conflict Detection Mechanism',
        description: 'Details version/timestamp checking and rollback/retry behaviour',
        maxMarks: 2,
      },
      {
        id: 'rub-3',
        name: 'Production Scenario Justification',
        description: 'Realistic high-read/low-contention example explained clearly',
        maxMarks: 1,
      },
    ],
    referenceAnswer:
      'OCC executes without locks and checks version on commit; preferred for read-heavy workloads where conflict rate is low.',
  },
  {
    id: 'eval-2',
    resultId: 'res-2',
    sessionId: 'sess-2',
    candidateId: 'can-2',
    candidateIdentifier: 'CAN-2026-002',
    candidateName: 'Aisha Khan',
    assessmentId: 'asmt-02',
    assessmentTitle: 'Data Analyst Assessment',
    questionId: 'q-205',
    questionTitle: 'Idempotent Batch ETL Design',
    questionPrompt:
      'Describe how you would design an idempotent batch ETL ingestion pipeline to handle network timeouts without duplicating target database records.',
    questionType: 'DESCRIPTIVE',
    candidateAnswer:
      'I would implement idempotency keys based on hash of batch source metadata + timestamp window, use staging tables with MERGE/UPSERT into target analytical tables, and record batch checkpoint status in a durable ledger before sending task completion acknowledgement.',
    submittedAt: '2026-10-23T16:30:00Z',
    maxMarks: 10,
    rubricCriteria: [
      {
        id: 'rub-4',
        name: 'Idempotency Key Strategy',
        description: 'Use of unique source batch keys, hashes or dedup tokens',
        maxMarks: 4,
      },
      {
        id: 'rub-5',
        name: 'Staging & Atomicity',
        description: 'Staging tables and atomic transactions or upserts',
        maxMarks: 4,
      },
      {
        id: 'rub-6',
        name: 'Checkpointing & Recovery',
        description: 'Ledger checkpointing and recovery without duplicates',
        maxMarks: 2,
      },
    ],
    referenceAnswer:
      'Use staging tables, deterministic checksum/idempotency keys, MERGE statements, and durable checkpoint tracking.',
  },
];

const mockResults: AssessmentResultRecord[] = [
  {
    id: 'res-1',
    sessionId: 'sess-1',
    candidateId: 'can-1',
    candidateIdentifier: 'CAN-2026-001',
    candidateName: 'Rohan Mehta',
    candidateEmail: 'rohan.mehta@nitk.edu.in',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    totalScore: 39,
    maxScore: 50,
    scorePercentage: 78,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'PASS',
    completedOn: '2026-10-24T11:45:00Z',
    timeTakenMinutes: 45,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-101',
        questionTitle: 'AVL Tree Search Time Complexity',
        questionType: 'MCQ_SINGLE',
        maxMarks: 2,
        marksAwarded: 2,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'O(log N)',
        correctAnswerText: 'O(log N)',
      },
      {
        questionId: 'q-102',
        questionTitle: 'O(N log N) Sorting Algorithms Multi-Select',
        questionType: 'MCQ_MULTIPLE',
        maxMarks: 4,
        marksAwarded: 4,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: ['Merge Sort', 'Quick Sort'],
        correctAnswerText: 'Merge Sort, Quick Sort',
      },
      {
        questionId: 'q-104',
        questionTitle: 'Two Sum Problem (Coding Challenge)',
        questionType: 'CODING',
        maxMarks: 24,
        marksAwarded: 20,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer:
          'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n}',
        testCasesPassed: 5,
        totalTestCases: 6,
      },
      {
        questionId: 'q-106',
        questionTitle: 'Optimistic vs Pessimistic Concurrency',
        questionType: 'DESCRIPTIVE',
        maxMarks: 20,
        marksAwarded: 13,
        evaluationStatus: 'EVALUATED',
        candidateAnswer: 'Candidate explained locking vs versioning with realistic examples.',
        evaluatorComments: 'Good explanation of OCC versioning and shopping cart flow.',
        evaluatorName: 'Technical Evaluator',
        evaluatedAt: '2026-10-24T12:30:00Z',
      },
    ],
    corrections: [],
  },
  {
    id: 'res-2',
    sessionId: 'sess-2',
    candidateId: 'can-2',
    candidateIdentifier: 'CAN-2026-002',
    candidateName: 'Aisha Khan',
    candidateEmail: 'aisha.khan@iitb.ac.in',
    assessmentId: 'asmt-02',
    assessmentTitle: 'Data Analyst Assessment',
    totalScore: 46.5,
    maxScore: 75,
    scorePercentage: 62,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'PASS',
    completedOn: '2026-10-23T16:30:00Z',
    timeTakenMinutes: 72,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-201',
        questionTitle: 'SQL Window Functions (Dense Rank)',
        questionType: 'SQL',
        maxMarks: 25,
        marksAwarded: 20,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer:
          'SELECT dept_id, emp_id, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rnk FROM employees;',
        testCasesPassed: 4,
        totalTestCases: 5,
      },
      {
        questionId: 'q-202',
        questionTitle: 'Data Normalization (3NF vs BCNF)',
        questionType: 'MCQ_SINGLE',
        maxMarks: 10,
        marksAwarded: 10,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'Every determinant is a candidate key in BCNF',
        correctAnswerText: 'Every determinant is a candidate key in BCNF',
      },
      {
        questionId: 'q-203',
        questionTitle: 'Indexing Strategy for Range Queries',
        questionType: 'MCQ_SINGLE',
        maxMarks: 15,
        marksAwarded: 7.5,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'B-Tree Index',
        correctAnswerText: 'B-Tree Index',
      },
      {
        questionId: 'q-204',
        questionTitle: 'Time-Series Aggregation Query',
        questionType: 'SQL',
        maxMarks: 25,
        marksAwarded: 9,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: "SELECT date_trunc('day', event_time), count(*) FROM events GROUP BY 1;",
        testCasesPassed: 2,
        totalTestCases: 5,
      },
    ],
    corrections: [],
  },
  {
    id: 'res-3',
    sessionId: 'sess-3',
    candidateId: 'can-8',
    candidateIdentifier: 'CAN-2026-008',
    candidateName: 'Karan Singh',
    candidateEmail: 'karan.singh@thapar.edu',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Backend Developer Test',
    totalScore: 24,
    maxScore: 50,
    scorePercentage: 48,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'FAIL',
    completedOn: '2026-10-23T14:15:00Z',
    timeTakenMinutes: 58,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-101',
        questionTitle: 'AVL Tree Search Time Complexity',
        questionType: 'MCQ_SINGLE',
        maxMarks: 2,
        marksAwarded: 0,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'O(N)',
        correctAnswerText: 'O(log N)',
      },
      {
        questionId: 'q-104',
        questionTitle: 'Two Sum Problem',
        questionType: 'CODING',
        maxMarks: 24,
        marksAwarded: 14,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'Brute force O(N^2) solution.',
        testCasesPassed: 3,
        totalTestCases: 6,
      },
      {
        questionId: 'q-106',
        questionTitle: 'Concurrency Control',
        questionType: 'DESCRIPTIVE',
        maxMarks: 24,
        marksAwarded: 10,
        evaluationStatus: 'EVALUATED',
        candidateAnswer: 'Brief overview with missing rollback explanation.',
        evaluatorComments: 'Incomplete explanation of lock escalation.',
      },
    ],
    corrections: [],
  },
  {
    id: 'res-4',
    sessionId: 'sess-4',
    candidateId: 'can-3',
    candidateIdentifier: 'CAN-2026-003',
    candidateName: 'Priya Sharma',
    candidateEmail: 'priya.sharma@bits-pilani.ac.in',
    assessmentId: 'asmt-03',
    assessmentTitle: 'Full Stack Assessment',
    totalScore: 42.5,
    maxScore: 50,
    scorePercentage: 85,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'PASS',
    completedOn: '2026-10-22T12:00:00Z',
    timeTakenMinutes: 50,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-101',
        questionTitle: 'AVL Tree Search Time Complexity',
        questionType: 'MCQ_SINGLE',
        maxMarks: 2,
        marksAwarded: 2,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'O(log N)',
        correctAnswerText: 'O(log N)',
      },
      {
        questionId: 'q-102',
        questionTitle: 'O(N log N) Sorting Algorithms Multi-Select',
        questionType: 'MCQ_MULTIPLE',
        maxMarks: 4,
        marksAwarded: 4,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: ['Merge Sort', 'Quick Sort'],
        correctAnswerText: 'Merge Sort, Quick Sort',
      },
      {
        questionId: 'q-104',
        questionTitle: 'Two Sum Problem',
        questionType: 'CODING',
        maxMarks: 24,
        marksAwarded: 24,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'Optimal O(N) hash map implementation.',
        testCasesPassed: 6,
        totalTestCases: 6,
      },
      {
        questionId: 'q-106',
        questionTitle: 'Concurrency Control',
        questionType: 'DESCRIPTIVE',
        maxMarks: 20,
        marksAwarded: 12.5,
        evaluationStatus: 'EVALUATED',
        candidateAnswer: 'Thorough discussion of MVCC and timestamp ordering.',
        evaluatorComments: 'Strong understanding of transaction isolation levels.',
      },
    ],
    corrections: [],
  },
  {
    id: 'res-5',
    sessionId: 'sess-5',
    candidateId: 'can-9',
    candidateIdentifier: 'CAN-2026-009',
    candidateName: 'Arjun Nair',
    candidateEmail: 'arjun.nair@manipal.edu',
    assessmentId: 'asmt-02',
    assessmentTitle: 'SQL Assessment',
    totalScore: 35,
    maxScore: 50,
    scorePercentage: 70,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'PASS',
    completedOn: '2026-10-22T10:15:00Z',
    timeTakenMinutes: 40,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-201',
        questionTitle: 'SQL Window Functions',
        questionType: 'SQL',
        maxMarks: 25,
        marksAwarded: 20,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer:
          'SELECT dept_id, emp_id, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) FROM employees;',
        testCasesPassed: 4,
        totalTestCases: 5,
      },
      {
        questionId: 'q-204',
        questionTitle: 'Time-Series Aggregation Query',
        questionType: 'SQL',
        maxMarks: 25,
        marksAwarded: 15,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'SELECT date, sum(amount) FROM sales GROUP BY date;',
        testCasesPassed: 3,
        totalTestCases: 5,
      },
    ],
    corrections: [],
  },
  {
    id: 'res-6',
    sessionId: 'sess-6',
    candidateId: 'can-5',
    candidateIdentifier: 'CAN-2026-005',
    candidateName: 'Ananya Reddy',
    candidateEmail: 'ananya.reddy@dtu.ac.in',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    totalScore: 30,
    maxScore: 50,
    scorePercentage: 60,
    passingScorePercentage: 60,
    status: 'PROVISIONAL', // FR-SCORE-008: Pending manual evaluation in queue
    passFailStatus: 'PASS',
    completedOn: '2026-10-25T11:00:00Z',
    timeTakenMinutes: 55,
    pendingManualCount: 1,
    questions: [
      {
        questionId: 'q-101',
        questionTitle: 'AVL Tree Search Time Complexity',
        questionType: 'MCQ_SINGLE',
        maxMarks: 2,
        marksAwarded: 2,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'O(log N)',
        correctAnswerText: 'O(log N)',
      },
      {
        questionId: 'q-102',
        questionTitle: 'O(N log N) Sorting Algorithms Multi-Select',
        questionType: 'MCQ_MULTIPLE',
        maxMarks: 4,
        marksAwarded: 4,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: ['Merge Sort', 'Quick Sort'],
        correctAnswerText: 'Merge Sort, Quick Sort',
      },
      {
        questionId: 'q-104',
        questionTitle: 'Two Sum Problem',
        questionType: 'CODING',
        maxMarks: 24,
        marksAwarded: 24,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'Optimal Map approach.',
        testCasesPassed: 6,
        totalTestCases: 6,
      },
      {
        questionId: 'q-106',
        questionTitle: 'Optimistic vs Pessimistic Concurrency',
        questionType: 'DESCRIPTIVE',
        maxMarks: 20,
        marksAwarded: 0,
        evaluationStatus: 'PENDING_EVALUATION',
        candidateAnswer:
          'Optimistic Concurrency Control (OCC) assumes conflicts are rare. Read and write operations proceed without acquiring exclusive database locks...',
      },
    ],
    corrections: [],
  },
  {
    id: 'res-7',
    sessionId: 'sess-7',
    candidateId: 'can-7',
    candidateIdentifier: 'CAN-2026-007',
    candidateName: 'Divya Iyer',
    candidateEmail: 'divya.iyer@annauniv.edu',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    totalScore: 46,
    maxScore: 50,
    scorePercentage: 92,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'PASS',
    completedOn: '2026-10-21T15:00:00Z',
    timeTakenMinutes: 38,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-101',
        questionTitle: 'AVL Tree Search Time Complexity',
        questionType: 'MCQ_SINGLE',
        maxMarks: 2,
        marksAwarded: 2,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'O(log N)',
        correctAnswerText: 'O(log N)',
      },
      {
        questionId: 'q-102',
        questionTitle: 'O(N log N) Sorting Algorithms Multi-Select',
        questionType: 'MCQ_MULTIPLE',
        maxMarks: 4,
        marksAwarded: 4,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: ['Merge Sort', 'Quick Sort'],
        correctAnswerText: 'Merge Sort, Quick Sort',
      },
      {
        questionId: 'q-104',
        questionTitle: 'Two Sum Problem',
        questionType: 'CODING',
        maxMarks: 24,
        marksAwarded: 24,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'Optimal solution with full test coverage.',
        testCasesPassed: 6,
        totalTestCases: 6,
      },
      {
        questionId: 'q-106',
        questionTitle: 'Concurrency Control',
        questionType: 'DESCRIPTIVE',
        maxMarks: 20,
        marksAwarded: 16,
        evaluationStatus: 'EVALUATED',
        candidateAnswer: 'Detailed analysis of locking protocols vs version store.',
        evaluatorComments: 'Excellent answer with precise examples.',
      },
    ],
    corrections: [],
  },
  {
    id: 'res-8',
    sessionId: 'sess-8',
    candidateId: 'can-4',
    candidateIdentifier: 'CAN-2026-004',
    candidateName: 'Vikram Patel',
    candidateEmail: 'vikram.patel@iiit.ac.in',
    assessmentId: 'asmt-01',
    assessmentTitle: 'Frontend Developer Test',
    totalScore: 27,
    maxScore: 50,
    scorePercentage: 54,
    passingScorePercentage: 60,
    status: 'FINAL',
    passFailStatus: 'FAIL',
    completedOn: '2026-10-20T17:30:00Z',
    timeTakenMinutes: 60,
    pendingManualCount: 0,
    questions: [
      {
        questionId: 'q-101',
        questionTitle: 'AVL Tree Search Time Complexity',
        questionType: 'MCQ_SINGLE',
        maxMarks: 2,
        marksAwarded: 2,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'O(log N)',
        correctAnswerText: 'O(log N)',
      },
      {
        questionId: 'q-102',
        questionTitle: 'O(N log N) Sorting Algorithms Multi-Select',
        questionType: 'MCQ_MULTIPLE',
        maxMarks: 4,
        marksAwarded: 2,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: ['Merge Sort'],
        correctAnswerText: 'Merge Sort, Quick Sort',
      },
      {
        questionId: 'q-104',
        questionTitle: 'Two Sum Problem',
        questionType: 'CODING',
        maxMarks: 24,
        marksAwarded: 15,
        evaluationStatus: 'AUTOMATED',
        candidateAnswer: 'Partial solution, edge cases failed.',
        testCasesPassed: 3,
        totalTestCases: 6,
      },
      {
        questionId: 'q-106',
        questionTitle: 'Concurrency Control',
        questionType: 'DESCRIPTIVE',
        maxMarks: 20,
        marksAwarded: 8,
        evaluationStatus: 'EVALUATED',
        candidateAnswer: 'Basic definitions only.',
      },
    ],
    corrections: [],
  },
];
