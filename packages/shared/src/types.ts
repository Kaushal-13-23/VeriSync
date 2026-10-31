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

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  REVOKED = 'REVOKED',
}

export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  DENIED = 'DENIED',
  FAILURE = 'FAILURE',
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

export enum NavigationMode {
  SEQUENTIAL = 'SEQUENTIAL',
  FREE = 'FREE',
}

export enum ResultVisibility {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
  ADMIN_RELEASE = 'ADMIN_RELEASE',
}

export enum TestCaseVisibility {
  SAMPLE = 'SAMPLE',
  HIDDEN = 'HIDDEN',
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
 * Candidate Management Types (FR-CAN-001..007, FR-AUTH-009)
 */
export interface CandidateProfileDto {
  id: string;
  candidateIdentifier: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string | null;
  institution: string;
  qualification: string;
  graduationYear: number;
  recruitmentReference: string;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCandidateResponse {
  candidate: CandidateProfileDto;
  temporaryPassword?: string; // Provisioned once; never logged or exported (FR-AUTH-009)
}

export interface CandidateCsvRow {
  candidateId: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  institution: string;
  qualification: string;
  graduationYear: number | string;
  recruitmentReference: string;
}

export interface CandidateCsvImportError {
  row: number;
  candidateId?: string;
  field?: string;
  error: string;
}

export interface CandidateCsvImportResult {
  totalRows: number;
  importedCount: number;
  errorCount: number;
  errors: CandidateCsvImportError[];
  importedCandidates: Array<{
    candidateId: string;
    username: string;
    email: string;
    temporaryPassword?: string;
  }>;
}

/**
 * Question Bank Types (FR-QB-001..010)
 */
export interface QuestionOptionDto {
  id?: string;
  optionText: string;
  displayOrder: number;
  isCorrect?: boolean; // Strictly omitted from candidate-facing representations (TC09, BR-009)
}

export interface TestCaseDto {
  id?: string;
  inputData: string;
  expectedOutput?: string; // Hidden test expected output omitted from candidate representations
  visibility: TestCaseVisibility;
  marks: number;
}

export interface QuestionDto {
  id: string;
  questionType: QuestionType;
  questionText: string;
  codeSnippet?: string | null;
  topic: string;
  difficulty: string;
  maximumMarks: number;
  negativeMarks: number;
  questionVersion: number;
  status: string;
  explanation?: string | null;
  options: QuestionOptionDto[];
  testCases?: TestCaseDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Assessment Management Types (FR-ASMT-001..008)
 */
export interface AssessmentQuestionMappingDto {
  questionId: string;
  sequenceNumber: number;
  timeLimitSeconds?: number | null;
  marksOverride?: number | null;
}

export interface AssessmentDto {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  roleCategory: string;
  overallDuration: number;
  totalMarks?: number | null;
  passingMarks?: number | null;
  negativeMarking: boolean;
  negativeMarkValue?: number | null;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  navigationMode: NavigationMode;
  resultVisibility: ResultVisibility;
  startAt: string;
  endAt: string;
  status: AssessmentStatus;
  attemptLimit: number;
  configurationVersion: number;
  publishedSnapshot?: unknown | null;
  createdBy: string;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Candidate Assigned Assessment (FR-UI-001)
 * Strips all internal question answer keys, correct indicators, and hidden test cases (TC09).
 */
export interface CandidateAssignedAssessmentDto {
  assignmentId: string;
  assessmentId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  roleCategory: string;
  overallDuration: number;
  totalMarks?: number | null;
  startAt: string;
  endAt: string;
  status: AssessmentStatus;
  attemptLimit: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  isEligible: boolean;
  eligibilityReason?: string;
  navigationMode: NavigationMode;
  serverTime: string; // UTC ISO-8601
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

/**
 * Exam Runtime & Session Types (SRS 3.2, 3.3, 3.4, FR-TIME-001..011, FR-ANS-001..009)
 */

export interface CandidateQuestionOptionDto {
  id: string;
  optionText: string;
  displayOrder: number;
  // Strict non-negotiable rule 2 & TC-09: zero isCorrect or answer key exposure
}

export interface CandidateSampleTestCaseDto {
  id: string;
  inputData: string;
  expectedOutput: string;
  // Hidden test cases are strictly excluded (FR-CODE-004, TC-10)
}

export interface CandidateQuestionDto {
  questionAttemptId: string;
  questionId: string;
  sequenceNumber: number;
  questionType: QuestionType;
  questionText: string;
  codeSnippet?: string | null;
  maximumMarks: number;
  timeLimitSeconds?: number | null;
  startedAt?: string | null;
  deadlineAt: string; // UTC ISO-8601
  remainingSeconds: number;
  options?: CandidateQuestionOptionDto[];
  sampleTestCases?: CandidateSampleTestCaseDto[];
  draftPayload?: unknown | null;
}

export type PaletteItemStatus = 'ANSWERED' | 'CURRENT' | 'NOT_ANSWERED';

export interface PaletteItemDto {
  sequenceNumber: number;
  questionAttemptId: string;
  status: PaletteItemStatus;
}

export interface StartSessionDto {
  clientVersion: string;
  deviceId?: string;
  acknowledgedInstructions: boolean;
}

export interface StartSessionResponseDto {
  sessionId: string;
  assignmentId: string;
  attemptNumber: number;
  startedAt: string;
  overallDeadline: string;
  overallRemainingSeconds: number;
  currentQuestion: CandidateQuestionDto;
  palette: PaletteItemDto[];
  serverTime: string;
}

export interface SessionStatusDto {
  sessionId: string;
  sessionStatus: SessionState;
  startedAt: string;
  overallDeadline: string;
  overallRemainingSeconds: number;
  currentQuestion?: CandidateQuestionDto | null;
  palette: PaletteItemDto[];
  serverTime: string;
}

export interface SubmitAnswerDto {
  questionAttemptId: string;
  answer: unknown;
}

export interface SubmitAnswerAckDto {
  status: 'accepted';
  questionAttemptId: string;
  submittedAt: string;
  next?: {
    questionAttemptId: string;
    sequenceNumber: number;
    deadlineAt: string;
  } | null;
  serverTime: string;
}

export interface SaveDraftDto {
  questionAttemptId: string;
  draftPayload: unknown;
}

export interface FinalSubmitResponseDto {
  status: 'submitted';
  sessionId: string;
  candidateIdentifier: string;
  assessmentTitle: string;
  totalQuestions: number;
  answeredCount: number;
  submittedAt: string;
  serverTime: string;
}

export type AdminSessionOverrideAction = 'EXTEND' | 'REOPEN' | 'PAUSE' | 'RESUME' | 'CANCEL';

export interface AdminSessionOverrideDto {
  action: AdminSessionOverrideAction;
  reason: string;
  extensionMinutes?: number;
}

export interface AdminSessionOverrideResponseDto {
  sessionId: string;
  previousStatus: SessionState;
  newStatus: SessionState;
  overallDeadline: string;
  overrideReason: string;
  performedBy: string;
  serverTime: string;
}

export interface SessionHeartbeatDto {
  deviceId?: string;
  clientVersion?: string;
}

export interface SessionHeartbeatResponseDto {
  status: 'ok';
  sessionStatus: SessionState;
  serverTime: string;
}
