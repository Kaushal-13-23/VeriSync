/**
 * VeriSync Results & Manual Scoring API Client
 * Traceability: FR-SCORE-001..010, FR-ADMIN-005, FR-ADMIN-006, UC-14, UC-15, BR-012, Rule 7, Rule 9
 */

import { apiFetch } from './client';
import {
  AssessmentResultRecord,
  GetResultsResponse,
  ResultFilterParams,
  ScoreCorrectionPayload,
  ScoreCorrectionResponse,
  EvaluationQueueItem,
  SubmitEvaluationPayload,
  SubmitEvaluationResponse,
} from '../types/api';

export const resultsApi = {
  async getResults(params?: ResultFilterParams): Promise<GetResultsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.assessmentId) searchParams.set('assessmentId', params.assessmentId);
    if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params?.passFail && params.passFail !== 'ALL') searchParams.set('passFail', params.passFail);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    return apiFetch<GetResultsResponse>(`/admin/results${qs ? `?${qs}` : ''}`);
  },

  async getResultById(id: string): Promise<AssessmentResultRecord> {
    return apiFetch<AssessmentResultRecord>(`/admin/results/${id}`);
  },

  async correctScore(payload: ScoreCorrectionPayload): Promise<ScoreCorrectionResponse> {
    return apiFetch<ScoreCorrectionResponse>(`/admin/results/${payload.resultId}/correct`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getEvaluationQueue(params?: { assessmentId?: string }): Promise<EvaluationQueueItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.assessmentId) searchParams.set('assessmentId', params.assessmentId);
    const qs = searchParams.toString();
    return apiFetch<EvaluationQueueItem[]>(`/admin/evaluation-queue${qs ? `?${qs}` : ''}`);
  },

  async submitEvaluation(payload: SubmitEvaluationPayload): Promise<SubmitEvaluationResponse> {
    return apiFetch<SubmitEvaluationResponse>(`/admin/evaluation-queue/${payload.queueItemId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
