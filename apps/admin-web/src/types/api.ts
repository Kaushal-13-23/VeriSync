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
