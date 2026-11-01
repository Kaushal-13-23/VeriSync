/**
 * Admin Live Sessions & Overrides API Client
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-004, FR-TIME-011, BR-012, Rule 7
 */

import { apiFetch } from './client';
import {
  LiveSessionRecord,
  SessionOverridePayload,
  SessionOverrideResult,
  AssessmentStatus,
  AssessmentRecord,
} from '../types/api';

export interface GetLiveSessionsResponse {
  sessions: LiveSessionRecord[];
  total: number;
  activeCount: number;
  interruptedCount: number;
  submittedCount: number;
  expiredCount: number;
  pausedCount: number;
}

export const sessionsApi = {
  async getLiveSessions(params?: {
    status?: string;
    assessmentId?: string;
    search?: string;
  }): Promise<GetLiveSessionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.assessmentId) searchParams.set('assessmentId', params.assessmentId);
    if (params?.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return apiFetch<GetLiveSessionsResponse>(`/admin/sessions${qs ? `?${qs}` : ''}`);
  },

  async getSessionById(id: string): Promise<LiveSessionRecord> {
    return apiFetch<LiveSessionRecord>(`/admin/sessions/${id}`);
  },

  async applyOverride(id: string, payload: SessionOverridePayload): Promise<SessionOverrideResult> {
    return apiFetch<SessionOverrideResult>(`/admin/sessions/${id}/override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async setAssessmentStatus(
    assessmentId: string,
    status: AssessmentStatus,
    reason: string,
  ): Promise<{ success: boolean; assessment: AssessmentRecord }> {
    return apiFetch<{ success: boolean; assessment: AssessmentRecord }>(
      `/admin/assessments/${assessmentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      },
    );
  },
};
