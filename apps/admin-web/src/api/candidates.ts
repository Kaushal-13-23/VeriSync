/**
 * Candidate Management API Client
 * Traceability: FR-CAN-001, FR-CAN-002, FR-CAN-003, FR-CAN-004, FR-CAN-005, FR-CAN-006, FR-CAN-007, FR-AUTH-005, FR-AUTH-009
 */

import { apiFetch } from './client';
import {
  CandidateRecord,
  CandidateInput,
  CandidateDetailProfile,
  CandidateCsvImportResult,
  CandidatePasswordResetResult,
  AssignAssessmentPayload,
  AssignmentResult,
  CandidateAccountStatus,
} from '../types/api';

export interface GetCandidatesResponse {
  candidates: CandidateRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const candidatesApi = {
  async getCandidates(params?: {
    search?: string;
    status?: string;
    drive?: string;
    page?: number;
    limit?: number;
  }): Promise<GetCandidatesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.drive) searchParams.set('drive', params.drive);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    return apiFetch<GetCandidatesResponse>(`/admin/candidates${qs ? `?${qs}` : ''}`);
  },

  async getCandidateById(id: string): Promise<CandidateDetailProfile> {
    return apiFetch<CandidateDetailProfile>(`/admin/candidates/${id}`);
  },

  async createCandidate(
    data: CandidateInput,
  ): Promise<{ candidate: CandidateRecord; temporaryPassword?: string }> {
    return apiFetch<{ candidate: CandidateRecord; temporaryPassword?: string }>(
      '/admin/candidates',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  async updateCandidate(
    id: string,
    data: Partial<CandidateInput>,
  ): Promise<{ candidate: CandidateRecord }> {
    return apiFetch<{ candidate: CandidateRecord }>(`/admin/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async setCandidateStatus(
    id: string,
    status: CandidateAccountStatus,
    reason?: string,
  ): Promise<{ success: boolean; candidate: CandidateRecord }> {
    return apiFetch<{ success: boolean; candidate: CandidateRecord }>(
      `/admin/candidates/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      },
    );
  },

  async resetPassword(id: string): Promise<CandidatePasswordResetResult> {
    return apiFetch<CandidatePasswordResetResult>(`/admin/candidates/${id}/reset-password`, {
      method: 'POST',
    });
  },

  async importCsv(csvData: string): Promise<CandidateCsvImportResult> {
    return apiFetch<CandidateCsvImportResult>('/admin/candidates/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    });
  },

  async assignAssessment(payload: AssignAssessmentPayload): Promise<AssignmentResult> {
    return apiFetch<AssignmentResult>('/admin/candidates/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async unassignAssessment(
    assessmentId: string,
    candidateId: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/admin/candidates/unassign', {
      method: 'POST',
      body: JSON.stringify({ assessmentId, candidateId }),
    });
  },
};
