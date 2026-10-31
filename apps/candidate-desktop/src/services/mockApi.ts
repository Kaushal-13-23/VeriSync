import {
  ApiErrorCode,
  ApiErrorResponse,
  HealthStatusResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  UserRole,
} from '@verisync/shared';

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
  type: 'single_choice' | 'coding' | 'sql';
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

// Sample mock questions matching docs/design/UI_Sample.jpeg
const sampleQuestions: MockQuestion[] = [
  {
    id: 'q_01',
    attemptId: 'qa_0001',
    index: 1,
    totalQuestions: 20,
    section: 'MCQ',
    title: 'Question 1 (MCQ)',
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
    id: 'q_12',
    attemptId: 'qa_0012',
    index: 12,
    totalQuestions: 20,
    section: 'Coding',
    title: 'Question 12 (Coding)',
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
    id: 'q_16',
    attemptId: 'qa_0016',
    index: 16,
    totalQuestions: 20,
    section: 'SQL',
    title: 'Question 16 (SQL)',
    statement: 'Write an SQL query to find the second highest salary from the Employee table.',
    sampleInput: 'Employee(id INT, salary INT)',
    sampleOutput: 'SecondHighestSalary: 200',
    type: 'sql',
    codeSnippet:
      'SELECT MAX(salary) AS SecondHighestSalary\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);',
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
    password?: string,
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
    const candidateId = identifier.startsWith('CAN-')
      ? identifier
      : `CAN-2026-${identifier.toUpperCase().slice(0, 3)}`;
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
   * Initialize candidate assessment session per UI Sample
   */
  initMockSession(candidateId: string): MockAssessmentSession {
    const now = new Date();
    const durationMinutes = 90;
    const deadline = new Date(now.getTime() + durationMinutes * 60 * 1000);

    activeMockSession = {
      sessionId: `sess-${Math.random().toString(36).slice(2, 8)}`,
      assessmentId: 'asmt-frontend-2026',
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
    idempotencyKey?: string,
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
      (q) =>
        q.attemptId !== payload.questionAttemptId && !session?.answeredAttemptIds.has(q.attemptId),
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
            deadlineAt: new Date(
              Date.now() + nextQuestion.durationMinutes * 60 * 1000,
            ).toISOString(),
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
  async finalSubmit(
    _sessionId: string,
    idempotencyKey?: string,
  ): Promise<{ status: 'accepted'; submittedAt: string }> {
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
