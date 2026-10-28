/**
 * VeriSync Mock Service Worker (MSW) Handlers
 * Matches packages/shared/openapi.yaml and docs/design/UI_Sample.jpeg exactly.
 * Traceability: FR-AUTH-001, FR-AUTH-008, FR-ADMIN-001, SRS 8.3.3, Rule 9
 */

import { http, HttpResponse } from 'msw';
import { ApiErrorCode } from '@verisync/shared';
import { DashboardStats } from '../types/api';

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

  // GET /api/v1/admin/dashboard-stats (FR-ADMIN-001, FR-ADMIN-002, UI_Sample.jpeg)
  http.get(/\/api\/v1\/admin\/dashboard-stats$/, () => {
    const stats: DashboardStats = {
      totalCandidates: { value: 1248, trend: '+ 12%' },
      totalAssessments: { value: 24, trend: '+ 3' },
      completedTests: { value: 892, trend: '+ 10%' },
      activeCandidates: { value: 356, trend: '+ 6%' },
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
        completed: 892,
        inProgress: 214,
        notStarted: 142,
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
];
