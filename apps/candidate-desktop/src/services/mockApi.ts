import {
  ApiErrorCode,
  ApiErrorResponse,
  AssessmentStatus,
  HealthStatusResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  UserRole,
} from '@verisync/shared';
import { CandidateAssignedAssessment } from '../types/assessment';

/**
 * Local Mock Server strictly matching packages/shared/openapi.yaml & SRS 8.3.3
 * Source of truth: packages/shared/openapi.yaml, docs/SRS/srs.md, docs/design/UI_Sample.jpeg
 * Non-Negotiable Rules:
 * - Rule 1: Server authority for deadlines, scoring, acceptance
 * - Rule 2: Candidate APIs never return answer keys or hidden test cases
 * - Rule 3: Every answer submission carries an Idempotency-Key; duplicates return original result
 * - Rule 9: Timestamps are UTC ISO-8601; API errors use SRS 8.3.3 codes with correlationId
 */

export interface MockUser {
  id: string;
  username: string;
  role: UserRole;
  candidateId: string;
}

export interface MockQuestion {
  id: string;
  attemptId: string;
  index: number;
  totalQuestions: number;
  section: 'MCQ' | 'Coding' | 'SQL';
  title: string;
  statement: string;
  explanation?: string;
  sampleInput?: string;
  sampleOutput?: string;
  type: 'single_choice' | 'multiple_select' | 'true_false' | 'short_answer' | 'coding' | 'sql';
  options?: Array<{ id: string; text: string }>;
  codeSnippet?: string;
  language?: string;
  durationMinutes: number;
}

export interface MockAssessmentSession {
  sessionId: string;
  assessmentId: string;
  title: string;
  candidateId: string;
  totalQuestions: number;
  totalDurationMinutes: number;
  startedAt: string;
  overallDeadlineAt: string;
  currentQuestionIndex: number;
  questions: MockQuestion[];
  answeredAttemptIds: Set<string>;
  markedForReviewIds: Set<string>;
  isFinalSubmitted: boolean;
}

// In-memory idempotency cache (SRS FR-ANS-009, Rule 3)
const idempotencyStore = new Map<string, SubmitAnswerResponse>();

// Sample mock questions matching docs/design/UI_Sample.jpeg & SRS FR-QB-003
const sampleQuestions: MockQuestion[] = [
  {
    id: 'q_01',
    attemptId: 'qa_0001',
    index: 1,
    totalQuestions: 6,
    section: 'MCQ',
    title: 'Question 1 (Single Choice MCQ)',
    statement: 'Which of the following is true regarding React synthetic events?',
    type: 'single_choice',
    options: [
      { id: 'opt_1', text: 'They are identical to native browser events.' },
      { id: 'opt_2', text: 'They are cross-browser wrappers around the browser native event.' },
      { id: 'opt_3', text: 'They only execute asynchronously outside the event loop.' },
      { id: 'opt_4', text: 'They cannot use preventDefault() or stopPropagation().' },
    ],
    durationMinutes: 2,
  },
  {
    id: 'q_02',
    attemptId: 'qa_0002',
    index: 2,
    totalQuestions: 6,
    section: 'MCQ',
    title: 'Question 2 (Multiple Select MCQ)',
    statement: 'Select all features supported in ECMAScript 2020 (ES11):',
    type: 'multiple_select',
    options: [
      { id: 'opt_2a', text: 'BigInt primitive type' },
      { id: 'opt_2b', text: 'Nullish coalescing operator (??)' },
      { id: 'opt_2c', text: 'Optional chaining (?.)' },
      { id: 'opt_2d', text: 'Macro-tasks scheduling API' },
    ],
    durationMinutes: 3,
  },
  {
    id: 'q_03',
    attemptId: 'qa_0003',
    index: 3,
    totalQuestions: 6,
    section: 'MCQ',
    title: 'Question 3 (True / False)',
    statement: 'In TypeScript, `unknown` is a type-safe counterpart of the `any` type and requires type narrowing before use.',
    type: 'true_false',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ],
    durationMinutes: 2,
  },
  {
    id: 'q_04',
    attemptId: 'qa_0004',
    index: 4,
    totalQuestions: 6,
    section: 'MCQ',
    title: 'Question 4 (Short Answer)',
    statement: 'What HTTP status code is officially returned by the server when the client software version is rejected as obsolete?',
    type: 'short_answer',
    durationMinutes: 3,
  },
  {
    id: 'q_05',
    attemptId: 'qa_0005',
    index: 5,
    totalQuestions: 6,
    section: 'Coding',
    title: 'Question 5 (Coding)',
    statement: 'Write a function to find the sum of all prime numbers up to a given number n.',
    sampleInput: 'n = 10',
    sampleOutput: '17',
    explanation: 'Prime numbers up to 10 are 2, 3, 5, 7. Sum = 17.',
    type: 'coding',
    language: 'python',
    codeSnippet: 'def sum_primes(n):\n    # Write your code here\n    pass\n',
    durationMinutes: 15,
  },
  {
    id: 'q_06',
    attemptId: 'qa_0006',
    index: 6,
    totalQuestions: 6,
    section: 'SQL',
    title: 'Question 6 (SQL)',
    statement: 'Write an SQL query to find the second highest salary from the Employee table.',
    sampleInput: 'Employee(id INT, salary INT)',
    sampleOutput: 'SecondHighestSalary: 200',
    type: 'sql',
    codeSnippet: 'SELECT MAX(salary) AS SecondHighestSalary\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);',
    durationMinutes: 8,
  },
];

let activeMockSession: MockAssessmentSession | null = null;

export const mockApi = {
  /**
   * GET /health (matches openapi.yaml)
   */
  async getHealth(): Promise<HealthStatusResponse> {
    return {
      status: 'ok',
      serverTime: new Date().toISOString(),
      version: '1.1.0',
    };
  },

  /**
   * POST /auth/login (matches openapi.yaml)
   * Supports either Candidate ID or Username (FR-CAN-007, Decision 3)
   */
  async login(
    identifier: string,
    password?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: MockUser }> {
    if (!identifier || identifier.trim() === '') {
      const err: ApiErrorResponse = {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Identifier (Candidate ID or Username) is required.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      };
      throw err;
    }

    if (!password || password.trim() === '') {
      const err: ApiErrorResponse = {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Password is required.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      };
      throw err;
    }

    // In mock mode, any non-empty password is accepted for testing candidate credentials
    const candidateId = identifier.startsWith('CAN-') ? identifier : `CAN-2026-${identifier.toUpperCase().slice(0, 3)}`;
    const user: MockUser = {
      id: `usr-${candidateId.toLowerCase()}`,
      username: identifier,
      role: UserRole.CANDIDATE,
      candidateId: candidateId,
    };

    return {
      accessToken: `mock-jwt-token-${user.id}-${Date.now()}`,
      refreshToken: `mock-refresh-token-${user.id}-${Date.now()}`,
      user,
    };
  },

  /**
   * GET /candidate/assessments (matches openapi.yaml & Dev A Phase 2)
   * Guaranteed zero answer keys or hidden test cases (BR-009, Rule 2, TC09)
   */
  async getAssignedAssessments(): Promise<CandidateAssignedAssessment[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hr ago
    const windowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000); // in 4 hrs

    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return [
      {
        assignmentId: 'asgn_01',
        assessmentId: 'asmt-frontend-2026',
        title: 'Frontend Developer Assessment',
        description: 'Comprehensive technical evaluation covering React, TypeScript, ECMAScript, Coding, and SQL.',
        instructions: 'Please read all rules carefully before proceeding. Sequential examination mode enforced.',
        roleCategory: 'Frontend Engineering',
        overallDuration: 90,
        totalMarks: 100,
        totalQuestions: 6,
        startAt: windowStart.toISOString(),
        endAt: windowEnd.toISOString(),
        status: AssessmentStatus.ACTIVE,
        attemptLimit: 1,
        attemptsUsed: 0,
        attemptsRemaining: 1,
        isEligible: true,
        navigationMode: 'SEQUENTIAL',
        serverTime: now.toISOString(),
      },
      {
        assignmentId: 'asgn_02',
        assessmentId: 'asmt-backend-2026',
        title: 'Backend Systems & Database Assessment',
        description: 'Covers NestJS, PostgreSQL concurrency, caching, and algorithmic problem solving.',
        instructions: 'Lockdown kiosk policy applies throughout the session.',
        roleCategory: 'Backend Engineering',
        overallDuration: 120,
        totalMarks: 120,
        totalQuestions: 8,
        startAt: futureStart.toISOString(),
        endAt: futureEnd.toISOString(),
        status: AssessmentStatus.SCHEDULED,
        attemptLimit: 1,
        attemptsUsed: 0,
        attemptsRemaining: 1,
        isEligible: false,
        eligibilityReason: 'Assessment availability window has not opened yet',
        navigationMode: 'SEQUENTIAL',
        serverTime: now.toISOString(),
      },
      {
        assignmentId: 'asgn_03',
        assessmentId: 'asmt-cs-core-2026',
        title: 'Core CS Fundamentals & Data Structures',
        description: 'Evaluates basic operating system concepts, networking, and algorithms.',
        roleCategory: 'General Software Engineering',
        overallDuration: 60,
        totalMarks: 50,
        totalQuestions: 5,
        startAt: pastStart.toISOString(),
        endAt: pastEnd.toISOString(),
        status: AssessmentStatus.COMPLETED,
        attemptLimit: 1,
        attemptsUsed: 1,
        attemptsRemaining: 0,
        isEligible: false,
        eligibilityReason: 'Maximum attempt limit exhausted',
        navigationMode: 'SEQUENTIAL',
        serverTime: now.toISOString(),
      },
    ];
  },

  /**
   * Initialize candidate assessment session per UI Sample
   */
  initMockSession(candidateId: string, assessmentId?: string): MockAssessmentSession {
    const now = new Date();
    const durationMinutes = 90;
    const deadline = new Date(now.getTime() + durationMinutes * 60 * 1000);

    activeMockSession = {
      sessionId: `sess-${Math.random().toString(36).slice(2, 8)}`,
      assessmentId: assessmentId || 'asmt-frontend-2026',
      title: 'Frontend Developer Assessment',
      candidateId: candidateId || 'CND12345',
      totalQuestions: 20,
      totalDurationMinutes: durationMinutes,
      startedAt: now.toISOString(),
      overallDeadlineAt: deadline.toISOString(),
      currentQuestionIndex: 0,
      questions: [...sampleQuestions],
      answeredAttemptIds: new Set<string>(),
      markedForReviewIds: new Set<string>(),
      isFinalSubmitted: false,
    };

    return activeMockSession;
  },

  getMockSession(): MockAssessmentSession | null {
    return activeMockSession;
  },

  /**
   * POST /assessments/active/submit-answer (matches openapi.yaml)
   * Enforces Idempotency-Key and SRS 8.3.3 error contracts
   */
  async submitAnswer(
    payload: SubmitAnswerPayload,
    idempotencyKey?: string
  ): Promise<SubmitAnswerResponse> {
    // Non-Negotiable Rule 3 & openapi.yaml: Idempotency-Key is required UUID header
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      const err: ApiErrorResponse = {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Missing required Idempotency-Key header.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      };
      throw err;
    }

    // Idempotency check: return cached original result if key seen before (FR-ANS-009)
    if (idempotencyStore.has(idempotencyKey)) {
      return idempotencyStore.get(idempotencyKey)!;
    }

    if (!payload.questionAttemptId) {
      const err: ApiErrorResponse = {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'questionAttemptId is required in payload.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      };
      throw err;
    }

    const nowIso = new Date().toISOString();
    const session = activeMockSession;
    const nextQuestion = session?.questions.find(
      (q) => q.attemptId !== payload.questionAttemptId && !session?.answeredAttemptIds.has(q.attemptId)
    );

    if (session) {
      session.answeredAttemptIds.add(payload.questionAttemptId);
    }

    const response: SubmitAnswerResponse = {
      status: 'accepted',
      questionAttemptId: payload.questionAttemptId,
      submittedAt: nowIso,
      next: nextQuestion
        ? {
            questionAttemptId: nextQuestion.attemptId,
            deadlineAt: new Date(Date.now() + nextQuestion.durationMinutes * 60 * 1000).toISOString(),
          }
        : undefined,
      serverTime: nowIso,
    };

    // Commit durably before acknowledging (Non-Negotiable Rule 4 & FR-ANS-003)
    idempotencyStore.set(idempotencyKey, response);
    return response;
  },

  /**
   * Mark attempt as final submitted (FR-UI-007, FR-ANS-008)
   */
  async finalSubmit(_sessionId: string, idempotencyKey?: string): Promise<{ status: 'accepted'; submittedAt: string }> {
    if (!idempotencyKey) {
      const err: ApiErrorResponse = {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Missing Idempotency-Key for final submit.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      };
      throw err;
    }

    if (activeMockSession) {
      activeMockSession.isFinalSubmitted = true;
    }

    return {
      status: 'accepted',
      submittedAt: new Date().toISOString(),
    };
  },

  resetStore(): void {
    idempotencyStore.clear();
    activeMockSession = null;
  },
};
