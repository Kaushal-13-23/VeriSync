/**
 * VeriSync Admin Web API & Domain Types
 * Traceability: FR-AUTH-001, FR-AUTH-007, FR-AUTH-008, FR-ADMIN-001, FR-ADMIN-009, SRS 8.3.3
 */

import { ApiErrorCode, ApiErrorResponse, HealthStatusResponse } from '@verisync/shared';

export { ApiErrorCode, type ApiErrorResponse, type HealthStatusResponse };

export type UserRole = 'SUPER_ADMIN' | 'TECHNICAL_EVALUATOR' | 'CANDIDATE';

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  fullName?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginApiResponse {
  mfaRequired: boolean;
  mfaToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface VerifyMfaPayload {
  mfaToken: string;
  code: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  user?: AuthUser;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'candidate_added' | 'assessment_scheduled' | 'test_completed' | 'questions_added';
  title: string;
  description: string;
  timestamp: string; // UTC ISO-8601 (Rule 9)
  timeAgo: string;
}

export interface CompletionRateStats {
  percentage: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

export interface UpcomingAssessmentItem {
  id: string;
  title: string;
  scheduleText: string;
  status: 'Scheduled' | 'Active' | 'Draft';
}

export interface DashboardStats {
  totalCandidates: { value: number; trend: string };
  totalAssessments: { value: number; trend: string };
  completedTests: { value: number; trend: string };
  activeCandidates: { value: number; trend: string };
  recentActivity: RecentActivityItem[];
  completionRate: CompletionRateStats;
  upcomingAssessments: UpcomingAssessmentItem[];
}
