/**
 * VeriSync Shared Domain Types & Enums
 * Source: docs/SRS/srs.md (Sections 3.3, 3.4, 9.1)
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CANDIDATE = 'CANDIDATE',
  TECHNICAL_EVALUATOR = 'TECHNICAL_EVALUATOR',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuestionType {
  MCQ_SINGLE = 'MCQ_SINGLE',
  MCQ_MULTIPLE = 'MCQ_MULTIPLE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  DESCRIPTIVE = 'DESCRIPTIVE',
  SCENARIO = 'SCENARIO',
  CODING = 'CODING',
  SQL = 'SQL',
}

/**
 * Assessment Session State Machine (SRS Section 3.3)
 */
export enum SessionState {
  NOT_STARTED = 'NOT_STARTED',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  INTERRUPTED = 'INTERRUPTED',
  SUBMITTED = 'SUBMITTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Question Attempt State Machine (SRS Section 3.4)
 */
export enum AttemptState {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUBMITTED = 'SUBMITTED',
  TIMED_OUT = 'TIMED_OUT',
  SKIPPED = 'SKIPPED',
  EVALUATION_PENDING = 'EVALUATION_PENDING',
  EVALUATED = 'EVALUATED',
}

/**
 * Health check response
 */
export interface HealthStatusResponse {
  status: 'ok' | 'degraded';
  serverTime: string; // UTC ISO-8601 (Rule 9)
  version: string;
}

/**
 * Standard Answer Submission Payload (FR-ANS-009)
 */
export interface SubmitAnswerPayload {
  questionAttemptId: string;
  response: unknown; // choice ID, text string, code, etc.
}

/**
 * Standard Answer Acceptance Response (SRS 8.3.1)
 */
export interface SubmitAnswerResponse {
  status: 'accepted';
  questionAttemptId: string;
  submittedAt: string; // UTC ISO-8601
  next?: {
    questionAttemptId: string;
    deadlineAt: string; // UTC ISO-8601
  };
  serverTime: string; // UTC ISO-8601
}
