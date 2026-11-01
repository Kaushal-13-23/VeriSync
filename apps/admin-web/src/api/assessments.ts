/**
 * Assessment Management API Client
 * Traceability: FR-ASMT-001, FR-ASMT-002, FR-ASMT-003, FR-ASMT-004, FR-ASMT-005, FR-ASMT-006, FR-ASMT-007, FR-ASMT-008, Decision 5
 */

import { apiFetch } from './client';
import {
  AssessmentRecord,
  CreateAssessmentPayload,
  AssessmentQuestionMapItem,
  AssessmentStatus,
} from '../types/api';

export interface GetAssessmentsResponse {
  assessments: AssessmentRecord[];
  total: number;
}

export const assessmentsApi = {
  async getAssessments(params?: {
    status?: string;
    roleCategory?: string;
    search?: string;
  }): Promise<GetAssessmentsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.roleCategory) searchParams.set('roleCategory', params.roleCategory);
    if (params?.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return apiFetch<GetAssessmentsResponse>(`/admin/assessments${qs ? `?${qs}` : ''}`);
  },

  async getAssessmentById(id: string): Promise<AssessmentRecord> {
    return apiFetch<AssessmentRecord>(`/admin/assessments/${id}`);
  },

  async createAssessment(data: CreateAssessmentPayload): Promise<AssessmentRecord> {
    return apiFetch<AssessmentRecord>('/admin/assessments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAssessment(
    id: string,
    data: Partial<CreateAssessmentPayload>,
  ): Promise<AssessmentRecord> {
    return apiFetch<AssessmentRecord>(`/admin/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async mapQuestions(
    id: string,
    questions: AssessmentQuestionMapItem[],
  ): Promise<{ success: boolean; mappedCount: number }> {
    return apiFetch<{ success: boolean; mappedCount: number }>(
      `/admin/assessments/${id}/questions`,
      {
        method: 'POST',
        body: JSON.stringify({ questions }),
      },
    );
  },

  async publishAssessment(
    id: string,
  ): Promise<{ success: boolean; assessment: AssessmentRecord; snapshotVersion: number }> {
    return apiFetch<{
      success: boolean;
      assessment: AssessmentRecord;
      snapshotVersion: number;
    }>(`/admin/assessments/${id}/publish`, {
      method: 'POST',
    });
  },

  async setStatus(
    id: string,
    status: AssessmentStatus,
    reason?: string,
  ): Promise<{ success: boolean; assessment: AssessmentRecord }> {
    return apiFetch<{ success: boolean; assessment: AssessmentRecord }>(
      `/admin/assessments/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      },
    );
  },
};
