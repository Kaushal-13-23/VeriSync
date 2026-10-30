/**
 * VeriSync Admin Web API & Domain Types
 * Traceability: FR-AUTH-001, FR-AUTH-007, FR-AUTH-008, FR-ADMIN-001, FR-ADMIN-009, SRS 8.3.3
 */

import { ApiErrorCode, ApiErrorResponse, HealthStatusResponse } from '@verisync/shared';

export { ApiErrorCode, type ApiErrorResponse, type HealthStatusResponse };

export type UserRole = 'SUPER_ADMIN' | 'TECHNICAL_EVALUATOR' | 'CANDIDATE';

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  fullName?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginApiResponse {
  mfaRequired: boolean;
  mfaToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface VerifyMfaPayload {
  mfaToken: string;
  code: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  user?: AuthUser;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'candidate_added' | 'assessment_scheduled' | 'test_completed' | 'questions_added';
  title: string;
  description: string;
  timestamp: string; // UTC ISO-8601 (Rule 9)
  timeAgo: string;
}

export interface CompletionRateStats {
  percentage: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

export interface UpcomingAssessmentItem {
  id: string;
  title: string;
  scheduleText: string;
  status: 'Scheduled' | 'Active' | 'Draft';
}

export interface DashboardStats {
  totalCandidates: { value: number; trend: string };
  totalAssessments: { value: number; trend: string };
  completedTests: { value: number; trend: string };
  activeCandidates: { value: number; trend: string };
  recentActivity: RecentActivityItem[];
  completionRate: CompletionRateStats;
  upcomingAssessments: UpcomingAssessmentItem[];
}

// ==========================================
// Candidate Domain Types (FR-CAN-001..007)
// ==========================================

export type CandidateAccountStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface CandidateRecord {
  id: string;
  candidateIdentifier: string; // e.g. CAN-2026-001
  fullName: string;
  username: string;
  email: string;
  phone?: string | null;
  institution: string;
  qualification: string;
  graduationYear: number;
  recruitmentReference: string;
  accountStatus: CandidateAccountStatus;
  testsAssignedCount: number;
  createdAt: string; // UTC ISO-8601 (Rule 9)
  updatedAt: string;
}

export interface CandidateInput {
  candidateIdentifier: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  institution: string;
  qualification: string;
  graduationYear: number;
  recruitmentReference: string;
  password?: string;
}

export interface CandidateLoginHistoryItem {
  id: string;
  timestamp: string; // UTC ISO-8601
  ipAddress: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED' | 'MFA_CHALLENGE';
}

export interface CandidateAssignmentItem {
  assignmentId: string;
  assessmentId: string;
  assessmentTitle: string;
  roleCategory: string;
  assignedAt: string;
  scheduleWindow: string;
  status: 'READY' | 'ACTIVE' | 'SUBMITTED' | 'EXPIRED' | 'NOT_STARTED';
  attemptStatus?: 'NOT_ATTEMPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'DISQUALIFIED';
  submissionStatus?: 'SUBMITTED' | 'UNSUBMITTED' | 'AUTO_SUBMITTED';
  submittedAt?: string;
  sessionId?: string;
  score?: number | null;
}

export interface CandidateDetailProfile extends CandidateRecord {
  loginHistory: CandidateLoginHistoryItem[];
  assignments: CandidateAssignmentItem[];
}

export interface CandidateCsvRowError {
  row: number;
  candidateId?: string;
  field?: string;
  error: string;
}

export interface CandidateCsvImportResult {
  totalRows: number;
  importedCount: number;
  errorCount: number;
  errors: CandidateCsvRowError[];
  importedCandidates?: CandidateRecord[];
}

export interface CandidatePasswordResetResult {
  success: boolean;
  temporaryPassword?: string;
  message: string;
}

// ==========================================
// Question Bank Domain Types (FR-QB-001..010)
// ==========================================

export type QuestionType =
  | 'MCQ_SINGLE'
  | 'MCQ_MULTIPLE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'DESCRIPTIVE'
  | 'SCENARIO'
  | 'CODING'
  | 'SQL';

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuestionOption {
  id?: string;
  optionText: string;
  displayOrder: number;
  isCorrect: boolean;
}

export interface QuestionTestCase {
  id?: string;
  inputData: string;
  expectedOutput: string;
  visibility: 'SAMPLE' | 'HIDDEN';
  marks?: number;
}

export interface QuestionRecord {
  id: string;
  questionType: QuestionType;
  questionText: string;
  codeSnippet?: string | null;
  topic: string;
  difficulty: QuestionDifficulty;
  maximumMarks: number;
  negativeMarks: number;
  explanation?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  options: QuestionOption[];
  testCases?: QuestionTestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionInput {
  questionType: QuestionType;
  questionText: string;
  codeSnippet?: string;
  topic: string;
  difficulty: QuestionDifficulty;
  maximumMarks: number;
  negativeMarks?: number;
  explanation?: string;
  options?: QuestionOption[];
  testCases?: QuestionTestCase[];
}

// ==========================================
// Assessment Domain Types (FR-ASMT-001..008)
// ==========================================

export type AssessmentStatus =
  'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'ARCHIVED';

export type NavigationMode = 'SEQUENTIAL' | 'FREE';

export type ResultVisibility = 'IMMEDIATE' | 'SCHEDULED' | 'ADMIN_RELEASE';

export interface AssessmentQuestionMapItem {
  questionId: string;
  sequenceNumber: number;
  timeLimitSeconds?: number | null;
  marksOverride?: number | null;
  question?: QuestionRecord;
}

export interface AssessmentRecord {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  roleCategory: string;
  overallDuration: number; // in minutes
  totalMarks?: number | null;
  passingMarks?: number | null;
  negativeMarking: boolean;
  negativeMarkValue: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  navigationMode: NavigationMode;
  resultVisibility: ResultVisibility;
  startAt: string; // UTC ISO-8601
  endAt: string; // UTC ISO-8601
  attemptLimit: number;
  status: AssessmentStatus;
  questionsCount?: number;
  assignedCandidatesCount?: number;
  questions?: AssessmentQuestionMapItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentPayload {
  title: string;
  description?: string;
  instructions?: string;
  roleCategory: string;
  overallDuration: number;
  totalMarks?: number;
  passingMarks?: number;
  negativeMarking?: boolean;
  negativeMarkValue?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  navigationMode?: NavigationMode;
  resultVisibility?: ResultVisibility;
  startAt: string;
  endAt: string;
  attemptLimit?: number;
  questions?: Array<{
    questionId: string;
    sequenceNumber: number;
    timeLimitSeconds?: number;
    marksOverride?: number;
  }>;
}

export interface AssignAssessmentPayload {
  assessmentId: string;
  candidateIds?: string[];
  groupFilter?: {
    recruitmentReference?: string;
    institution?: string;
    graduationYear?: number;
  };
}

export interface AssignmentResult {
  success: boolean;
  assignedCount: number;
  alreadyAssignedCount: number;
  message: string;
}

// ==========================================
// Live Sessions & Overrides Domain Types (FR-ADMIN-001..004, FR-TIME, BR-012)
// ==========================================

export type SessionStatus =
  'ACTIVE' | 'INTERRUPTED' | 'SUBMITTED' | 'EXPIRED' | 'PAUSED' | 'CANCELLED';

export type SessionOverrideType = 'EXTEND' | 'REOPEN' | 'PAUSE' | 'RESUME' | 'CANCEL';

export interface LiveSessionRecord {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  candidateId: string;
  candidateIdentifier: string;
  candidateName: string;
  candidateEmail: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestionId?: string;
  startedAt: string; // UTC ISO-8601
  lastHeartbeatAt: string; // UTC ISO-8601
  overallRemainingSeconds: number;
  questionRemainingSeconds?: number | null;
  clientIp: string;
  clientVersion: string;
  extensionMinutesApplied?: number;
  overrideReason?: string;
  notes?: string;
}

export interface SessionOverridePayload {
  overrideType: SessionOverrideType;
  reason: string; // Mandatory per BR-012 and Rule 7
  extensionMinutes?: number;
  notes?: string;
}

export interface SessionOverrideResult {
  success: boolean;
  session: LiveSessionRecord;
  auditLogId: string;
  correlationId: string;
  message: string;
}

// ==========================================
// Audit Logs & Incident Domain Types (FR-ADMIN-007, FR-ADMIN-008, SRS 11.4)
// ==========================================

export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'SESSION_START'
  | 'SESSION_SUBMIT'
  | 'SESSION_OVERRIDE'
  | 'ASSESSMENT_PUBLISH'
  | 'ASSESSMENT_STATUS'
  | 'CANDIDATE_CREATE'
  | 'CANDIDATE_UPDATE'
  | 'CANDIDATE_STATUS'
  | 'PASSWORD_RESET'
  | 'SECURITY_ALERT'
  | 'SCORE_CORRECTION';

export type AuditOutcome = 'SUCCESS' | 'FAILED' | 'BLOCKED';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // UTC ISO-8601
  eventType: AuditEventType;
  actorId: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  outcome: AuditOutcome;
  reason?: string | null;
  correlationId: string;
  ipAddress: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilterParams {
  eventType?: string;
  actor?: string;
  entityType?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  page?: number;
  limit?: number;
}

export interface GetAuditLogsResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IncidentRecord {
  id: string;
  timestamp: string; // UTC ISO-8601
  sessionId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  candidateId?: string;
  candidateIdentifier?: string;
  candidateName?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  overrideAction?: SessionOverrideType;
  actor: string;
  resolutionNotes?: string;
  correlationId: string;
}

// ==========================================
// Results & Scoring Domain Types (FR-SCORE-001..010, UC-14, UC-15, UI_Sample.jpeg)
// ==========================================

export type ResultStatus = 'FINAL' | 'PROVISIONAL';
export type PassFailStatus = 'PASS' | 'FAIL';
export type QuestionEvaluationStatus =
  'AUTOMATED' | 'PENDING_EVALUATION' | 'EVALUATED' | 'CORRECTED';

export interface RubricCriterionScore {
  id: string;
  name: string;
  maxMarks: number;
  awardedMarks: number;
}

export interface QuestionResultItem {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  maxMarks: number;
  marksAwarded: number;
  evaluationStatus: QuestionEvaluationStatus;
  candidateAnswer: string | string[];
  correctAnswerText?: string;
  evaluatorComments?: string;
  evaluatorName?: string;
  evaluatedAt?: string;
  rubricCriteria?: RubricCriterionScore[];
  testCasesPassed?: number;
  totalTestCases?: number;
}

export interface ScoreCorrectionHistoryItem {
  id: string;
  timestamp: string; // UTC ISO-8601 (Rule 9)
  questionId?: string | null; // null if overall correction
  questionTitle?: string;
  originalScore: number;
  revisedScore: number;
  reason: string; // Mandatory (BR-012, Rule 7)
  adminId: string;
  adminName: string;
  correlationId: string;
}

export interface AssessmentResultRecord {
  id: string;
  sessionId: string;
  candidateId: string;
  candidateIdentifier: string; // e.g. CAN-2026-001
  candidateName: string;
  candidateEmail: string;
  assessmentId: string;
  assessmentTitle: string;
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  passingScorePercentage: number;
  status: ResultStatus; // FINAL | PROVISIONAL (FR-SCORE-008)
  passFailStatus: PassFailStatus; // PASS | FAIL
  completedOn: string; // UTC ISO-8601 (Rule 9)
  timeTakenMinutes: number;
  pendingManualCount: number;
  questions: QuestionResultItem[];
  corrections: ScoreCorrectionHistoryItem[];
}

export interface ResultFilterParams {
  assessmentId?: string;
  status?: 'ALL' | 'FINAL' | 'PROVISIONAL';
  passFail?: 'ALL' | 'PASS' | 'FAIL';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetResultsResponse {
  results: AssessmentResultRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScoreCorrectionPayload {
  resultId: string;
  questionId?: string | null; // null for total score correction
  newScore: number;
  reason: string; // Mandatory (BR-012, Rule 7)
}

export interface ScoreCorrectionResponse {
  success: boolean;
  result: AssessmentResultRecord;
  correction: ScoreCorrectionHistoryItem;
  correlationId: string;
  message: string;
}

// ==========================================
// Manual Evaluation Queue Types (UC-14, FR-SCORE-004, FR-SCORE-005)
// ==========================================

export interface EvaluationRubricItem {
  id: string;
  name: string;
  description: string;
  maxMarks: number;
}

export interface EvaluationQueueItem {
  id: string;
  resultId: string;
  sessionId: string;
  candidateId: string;
  candidateIdentifier: string;
  candidateName: string;
  assessmentId: string;
  assessmentTitle: string;
  questionId: string;
  questionTitle: string;
  questionPrompt: string;
  questionType: QuestionType;
  candidateAnswer: string;
  submittedAt: string;
  maxMarks: number;
  rubricCriteria: EvaluationRubricItem[];
  referenceAnswer?: string;
}

export interface SubmitEvaluationPayload {
  queueItemId: string;
  awardedMarks: number;
  rubricScores?: Record<string, number>;
  comments: string;
}

export interface SubmitEvaluationResponse {
  success: boolean;
  resultId: string;
  resultStatus: ResultStatus;
  updatedMarks: number;
  correlationId: string;
  message: string;
}

// ==========================================
// Reports & Analytics Domain Types (FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-009)
// ==========================================

export interface AssessmentSummaryReport {
  assessmentId: string;
  assessmentTitle: string;
  totalCompleted: number;
  averageScorePercentage: number;
  passRatePercentage: number;
  highestScorePercentage: number;
  lowestScorePercentage: number;
  averageTimeTakenMinutes: number;
  passingThresholdPercentage: number;
}

export interface CandidateRankingItem {
  rank: number;
  candidateId: string;
  candidateIdentifier: string;
  candidateName: string;
  scorePercentage: number;
  totalScore: number;
  maxScore: number;
  passFailStatus: PassFailStatus;
  timeTakenMinutes: number;
  completedOn: string;
}

export interface McqOptionDistribution {
  optionKey: string;
  optionLabel: string;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

export interface QuestionPerformanceStats {
  questionId: string;
  title: string;
  type: QuestionType;
  correctAnswerRate: number; // 0 - 100
  averageScore: number;
  maxScore: number;
  difficultyIndex: 'EASY' | 'MEDIUM' | 'HARD';
  discriminationIndex: number;
  responseDistribution?: McqOptionDistribution[];
}
