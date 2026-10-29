/**
 * Question Bank API Client
 * Traceability: FR-QB-001, FR-QB-002, FR-QB-003, FR-QB-004, FR-QB-005, FR-QB-006, FR-QB-007, FR-QB-008, FR-QB-009, FR-QB-010
 */

import { apiFetch } from './client';
import { QuestionRecord, QuestionInput } from '../types/api';

export interface GetQuestionsResponse {
  questions: QuestionRecord[];
  total: number;
}

export const questionsApi = {
  async getQuestions(params?: {
    topic?: string;
    difficulty?: string;
    type?: string;
    search?: string;
  }): Promise<GetQuestionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.topic) searchParams.set('topic', params.topic);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.search) searchParams.set('search', params.search);

    const qs = searchParams.toString();
    return apiFetch<GetQuestionsResponse>(`/admin/questions${qs ? `?${qs}` : ''}`);
  },

  async getQuestionById(id: string): Promise<QuestionRecord> {
    return apiFetch<QuestionRecord>(`/admin/questions/${id}`);
  },

  async createQuestion(data: QuestionInput): Promise<QuestionRecord> {
    return apiFetch<QuestionRecord>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQuestion(id: string, data: Partial<QuestionInput>): Promise<QuestionRecord> {
    return apiFetch<QuestionRecord>(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async archiveQuestion(
    id: string,
    status: 'ACTIVE' | 'ARCHIVED' = 'ARCHIVED',
  ): Promise<{ success: boolean; question: QuestionRecord }> {
    return apiFetch<{ success: boolean; question: QuestionRecord }>(
      `/admin/questions/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
  },
};
