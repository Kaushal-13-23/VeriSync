/**
 * Assessment Domain Types for Candidate Desktop
 * Source: docs/SRS/srs.md (FR-UI-001, FR-ASMT-006, UC-08, openapi.yaml)
 */

import { AssessmentStatus, FinalSubmitResponseDto } from '@verisync/shared';

export type NavigationMode = 'SEQUENTIAL' | 'FREE';
export type ResultVisibility = 'IMMEDIATE' | 'SCHEDULED' | 'ADMIN_RELEASE';

export interface CandidateResultSummary {
  totalScore: number;
  maximumScore: number;
  percentage: number;
  passed: boolean;
  benchmarkScore?: number;
  resultStatus: 'PROVISIONAL' | 'FINAL';
  provisionalReason?: string;
  evaluatedAt: string;
}

export interface CandidateFinalSubmitResponse extends FinalSubmitResponseDto {
  resultVisibility?: ResultVisibility;
  result?: CandidateResultSummary | null;
}

export interface CandidateAssignedAssessment {
  assignmentId: string;
  assessmentId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  roleCategory: string;
  overallDuration: number; // in minutes
  totalMarks?: number | null;
  totalQuestions?: number;
  startAt: string; // ISO-8601 UTC
  endAt: string; // ISO-8601 UTC
  status: AssessmentStatus | string;
  attemptLimit: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  isEligible: boolean;
  eligibilityReason?: string;
  navigationMode: NavigationMode;
  resultVisibility?: ResultVisibility;
  serverTime: string;
}
