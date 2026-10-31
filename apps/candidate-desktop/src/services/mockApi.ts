import {
  ApiErrorCode,
  ApiErrorResponse,
  AssessmentStatus,
  CandidateQuestionDto,
  FinalSubmitResponseDto,
  HealthStatusResponse,
  PaletteItemDto,
  QuestionType,
  SaveDraftDto,
  SessionHeartbeatResponseDto,
  SessionState,
  SessionStatusDto,
  StartSessionResponseDto,
  SubmitAnswerAckDto,
  SubmitAnswerDto,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  UserRole,
} from '@verisync/shared';
import { CandidateAssignedAssessment } from '../types/assessment';

/**
 * Local Mock Server strictly matching packages/shared/openapi.yaml & SRS 8.3.3
 * Source of truth: packages/shared/openapi.yaml, docs/SRS/srs.md, docs/design/UI_Sample.jpeg
 * Non-Negotiable Rules:
 * - Rule 1: Server authority for deadlines, scoring, acceptance (FR-TIME-001)
 * - Rule 2: Candidate APIs never return answer keys or hidden test cases (TC09)
 * - Rule 3: Every answer submission carries an Idempotency-Key; duplicates return original result (FR-ANS-009, TC04, TC05)
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
  type:
    | 'single_choice'
    | 'multiple_select'
    | 'true_false'
    | 'short_answer'
    | 'coding'
    | 'sql'
    | QuestionType;
  options?: Array<{ id: string; text: string; optionText?: string }>;
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

// In-memory stores
const idempotencyStore = new Map<string, SubmitAnswerResponse>();
const sessionAckStore = new Map<string, SubmitAnswerAckDto>();
const sessionDraftsStore = new Map<string, unknown>();

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
    statement:
      'In TypeScript, `unknown` is a type-safe counterpart of the `any` type and requires type narrowing before use.',
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
    statement:
      'What HTTP status code is officially returned by the server when the client software version is rejected as obsolete?',
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
    codeSnippet:
      'SELECT MAX(salary) AS SecondHighestSalary\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);',
    durationMinutes: 8,
  },
];

let activeMockSession: MockAssessmentSession | null = null;
let mockSessionStatus: SessionState = SessionState.NOT_STARTED;
let currentQuestionDeadline: Date = new Date();

function mapMockQuestionToDto(
  q: MockQuestion,
  sequence: number,
  deadlineAt: string,
  remainingSec: number,
): CandidateQuestionDto {
  let mappedType: QuestionType = QuestionType.MCQ_SINGLE;
  if (q.type === 'single_choice' || q.type === QuestionType.MCQ_SINGLE)
    mappedType = QuestionType.MCQ_SINGLE;
  else if (q.type === 'multiple_select' || q.type === QuestionType.MCQ_MULTIPLE)
    mappedType = QuestionType.MCQ_MULTIPLE;
  else if (q.type === 'true_false' || q.type === QuestionType.TRUE_FALSE)
    mappedType = QuestionType.TRUE_FALSE;
  else if (q.type === 'short_answer' || q.type === QuestionType.SHORT_ANSWER)
    mappedType = QuestionType.SHORT_ANSWER;
  else if (q.type === 'coding' || q.type === QuestionType.CODING) mappedType = QuestionType.CODING;
  else if (q.type === 'sql' || q.type === QuestionType.SQL) mappedType = QuestionType.SQL;

  return {
    questionAttemptId: q.attemptId,
    questionId: q.id,
    sequenceNumber: sequence,
    questionType: mappedType,
    questionText: q.statement,
    codeSnippet: q.codeSnippet,
    maximumMarks: 2,
    timeLimitSeconds: q.durationMinutes * 60,
    startedAt: new Date().toISOString(),
    deadlineAt,
    remainingSeconds: remainingSec,
    options: q.options?.map((opt, oIdx) => ({
      id: opt.id,
      optionText: opt.text || (opt as { optionText?: string }).optionText || '',
      displayOrder: oIdx + 1,
    })),
    sampleTestCases: q.sampleInput
      ? [
          {
            id: `stc_${q.id}`,
            inputData: q.sampleInput,
            expectedOutput: q.sampleOutput || '',
          },
        ]
      : undefined,
  };
}

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
   * GET /candidate/assessments (matches openapi.yaml & Dev A Phase 2)
   * Guaranteed zero answer keys or hidden test cases (BR-009, Rule 2, TC09)
   */
  async getAssignedAssessments(): Promise<CandidateAssignedAssessment[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return [
      {
        assignmentId: 'asgn_01',
        assessmentId: 'asmt-frontend-2026',
        title: 'Frontend Developer Assessment',
        description:
          'Comprehensive technical evaluation covering React, TypeScript, ECMAScript, Coding, and SQL.',
        instructions:
          'Please read all rules carefully before proceeding. Sequential examination mode enforced.',
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
        description:
          'Covers NestJS, PostgreSQL concurrency, caching, and algorithmic problem solving.',
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
   * Phase 3: Start Assessment Session (POST /candidate/assessments/:id/start)
   * FR-UI-002, BR-007, TC-15, TC-16
   */
  async startSession(assessmentId?: string): Promise<StartSessionResponseDto> {
    const session = this.initMockSession('CAN-2026-081', assessmentId);
    mockSessionStatus = SessionState.ACTIVE;

    const currentQ = session.questions[0];
    const qDurationMs = currentQ.durationMinutes * 60 * 1000;
    currentQuestionDeadline = new Date(Date.now() + qDurationMs);

    const palette: PaletteItemDto[] = session.questions.map((q, idx) => ({
      sequenceNumber: idx + 1,
      questionAttemptId: q.attemptId,
      status: idx === 0 ? 'CURRENT' : 'NOT_ANSWERED',
    }));

    const dto = mapMockQuestionToDto(
      currentQ,
      1,
      currentQuestionDeadline.toISOString(),
      currentQ.durationMinutes * 60,
    );

    return {
      sessionId: session.sessionId,
      assignmentId: `asgn_${session.assessmentId}`,
      attemptNumber: 1,
      startedAt: session.startedAt,
      overallDeadline: session.overallDeadlineAt,
      overallRemainingSeconds: session.totalDurationMinutes * 60,
      currentQuestion: dto,
      palette,
      serverTime: new Date().toISOString(),
    };
  },

  /**
   * Phase 3: Get Active Question (GET /candidate/sessions/:id/current-question)
   * FR-UI-003, TC-08, TC-09
   */
  async getCurrentQuestion(_sessionId: string): Promise<CandidateQuestionDto> {
    if (!activeMockSession) {
      this.initMockSession('CAN-2026-081');
    }
    const session = activeMockSession!;
    const idx = session.currentQuestionIndex;
    const currentQ = session.questions[idx] || session.questions[0];
    const remainingSec = Math.max(
      0,
      Math.floor((currentQuestionDeadline.getTime() - Date.now()) / 1000),
    );

    return mapMockQuestionToDto(
      currentQ,
      idx + 1,
      currentQuestionDeadline.toISOString(),
      remainingSec,
    );
  },

  /**
   * Phase 3: Get Session Status (GET /candidate/sessions/:id/status)
   * FR-TIME-008, FR-UI-004, TC-07
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatusDto> {
    if (!activeMockSession) {
      this.initMockSession('CAN-2026-081');
    }
    const session = activeMockSession!;
    const now = Date.now();
    const overallDeadlineMs = new Date(session.overallDeadlineAt).getTime();
    const overallRemainingSeconds = Math.max(0, Math.floor((overallDeadlineMs - now) / 1000));

    const palette: PaletteItemDto[] = session.questions.map((q, idx) => {
      let st: 'ANSWERED' | 'CURRENT' | 'NOT_ANSWERED' = 'NOT_ANSWERED';
      if (session.answeredAttemptIds.has(q.attemptId)) {
        st = 'ANSWERED';
      } else if (idx === session.currentQuestionIndex) {
        st = 'CURRENT';
      }
      return {
        sequenceNumber: idx + 1,
        questionAttemptId: q.attemptId,
        status: st,
      };
    });

    const currentDto = await this.getCurrentQuestion(sessionId);

    return {
      sessionId: session.sessionId,
      sessionStatus: mockSessionStatus,
      startedAt: session.startedAt,
      overallDeadline: session.overallDeadlineAt,
      overallRemainingSeconds,
      currentQuestion: currentDto,
      palette,
      serverTime: new Date().toISOString(),
    };
  },

  /**
   * Phase 3: Submit Question Answer with Idempotency-Key
   * POST /candidate/sessions/:id/answers (FR-ANS-001..009, TC-01..05)
   */
  async submitSessionAnswer(
    _sessionId: string,
    dto: SubmitAnswerDto,
    idempotencyKey: string,
  ): Promise<SubmitAnswerAckDto> {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      throw {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Missing required Idempotency-Key header.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      } as ApiErrorResponse;
    }

    // Check duplicate request with same idempotency key (TC04, Rule 3)
    if (sessionAckStore.has(idempotencyKey)) {
      return sessionAckStore.get(idempotencyKey)!;
    }

    if (!activeMockSession) {
      this.initMockSession('CAN-2026-081');
    }
    const session = activeMockSession!;

    // Deadline check (TC05, FR-TIME-004): reject late submission
    if (Date.now() > currentQuestionDeadline.getTime()) {
      throw {
        status: 'rejected',
        code: ApiErrorCode.QUESTION_EXPIRED,
        message: 'Question attempt time limit has expired.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      } as ApiErrorResponse;
    }

    session.answeredAttemptIds.add(dto.questionAttemptId);

    const nextIdx = session.currentQuestionIndex + 1;
    let nextInfo: { questionAttemptId: string; sequenceNumber: number; deadlineAt: string } | null =
      null;

    if (nextIdx < session.questions.length) {
      session.currentQuestionIndex = nextIdx;
      const nextQ = session.questions[nextIdx];
      currentQuestionDeadline = new Date(Date.now() + nextQ.durationMinutes * 60 * 1000);
      nextInfo = {
        questionAttemptId: nextQ.attemptId,
        sequenceNumber: nextIdx + 1,
        deadlineAt: currentQuestionDeadline.toISOString(),
      };
    }

    const ack: SubmitAnswerAckDto = {
      status: 'accepted',
      questionAttemptId: dto.questionAttemptId,
      submittedAt: new Date().toISOString(),
      next: nextInfo,
      serverTime: new Date().toISOString(),
    };

    sessionAckStore.set(idempotencyKey, ack);
    return ack;
  },

  /**
   * Phase 3: Autosave Draft (PUT /candidate/sessions/:id/draft)
   */
  async saveDraft(_sessionId: string, dto: SaveDraftDto): Promise<{ success: boolean }> {
    sessionDraftsStore.set(dto.questionAttemptId, dto.draftPayload);
    return { success: true };
  },

  /**
   * Phase 3: Final Assessment Submission (POST /candidate/sessions/:id/final-submit)
   */
  async finalSubmitSession(_sessionId: string): Promise<FinalSubmitResponseDto> {
    if (!activeMockSession) {
      this.initMockSession('CAN-2026-081');
    }
    const session = activeMockSession!;
    mockSessionStatus = SessionState.SUBMITTED;
    session.isFinalSubmitted = true;

    return {
      status: 'submitted',
      sessionId: session.sessionId,
      candidateIdentifier: session.candidateId,
      assessmentTitle: session.title,
      totalQuestions: session.totalQuestions,
      answeredCount: session.answeredAttemptIds.size,
      submittedAt: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    };
  },

  /**
   * Phase 3: Session Heartbeat (POST /candidate/sessions/:id/heartbeat)
   */
  async sendHeartbeat(_sessionId: string): Promise<SessionHeartbeatResponseDto> {
    return {
      status: 'ok',
      sessionStatus: mockSessionStatus,
      serverTime: new Date().toISOString(),
    };
  },

  /**
   * Legacy mock methods retained for backwards compatibility
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
      totalQuestions: sampleQuestions.length,
      totalDurationMinutes: durationMinutes,
      startedAt: now.toISOString(),
      overallDeadlineAt: deadline.toISOString(),
      currentQuestionIndex: 0,
      questions: [...sampleQuestions],
      answeredAttemptIds: new Set<string>(),
      markedForReviewIds: new Set<string>(),
      isFinalSubmitted: false,
    };
    mockSessionStatus = SessionState.ACTIVE;
    currentQuestionDeadline = new Date(
      now.getTime() + sampleQuestions[0].durationMinutes * 60 * 1000,
    );

    return activeMockSession;
  },

  getMockSession(): MockAssessmentSession | null {
    return activeMockSession;
  },

  setQuestionDeadline(date: Date): void {
    currentQuestionDeadline = date;
  },

  async submitAnswer(
    payload: SubmitAnswerPayload,
    idempotencyKey?: string,
  ): Promise<SubmitAnswerResponse> {
    if (!idempotencyKey || idempotencyKey.trim() === '') {
      const err: ApiErrorResponse = {
        status: 'rejected',
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Missing required Idempotency-Key header.',
        correlationId: `c-${Math.random().toString(36).slice(2, 8)}`,
      };
      throw err;
    }

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

    idempotencyStore.set(idempotencyKey, response);
    return response;
  },

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
    mockSessionStatus = SessionState.SUBMITTED;

    return {
      status: 'accepted',
      submittedAt: new Date().toISOString(),
    };
  },

  resetStore(): void {
    idempotencyStore.clear();
    sessionAckStore.clear();
    sessionDraftsStore.clear();
    activeMockSession = null;
    mockSessionStatus = SessionState.NOT_STARTED;
  },
};
