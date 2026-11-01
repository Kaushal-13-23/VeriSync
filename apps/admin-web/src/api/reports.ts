/**
 * VeriSync Reports & Analytics API Client
 * Traceability: FR-ADMIN-005, FR-ADMIN-006, FR-ADMIN-007, FR-SCORE-009, Rule 9
 */

import { apiFetch } from './client';
import {
  AssessmentSummaryReport,
  CandidateRankingItem,
  QuestionPerformanceStats,
} from '../types/api';

export const reportsApi = {
  async getAssessmentSummary(assessmentId: string): Promise<AssessmentSummaryReport> {
    return apiFetch<AssessmentSummaryReport>(`/admin/reports/${assessmentId}/summary`);
  },

  async getCandidateRankings(assessmentId: string): Promise<CandidateRankingItem[]> {
    return apiFetch<CandidateRankingItem[]>(`/admin/reports/${assessmentId}/rankings`);
  },

  async getQuestionStats(assessmentId: string): Promise<QuestionPerformanceStats[]> {
    return apiFetch<QuestionPerformanceStats[]>(`/admin/reports/${assessmentId}/question-stats`);
  },
};
