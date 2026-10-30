/**
 * VeriSync Coding and SQL Domain Types for Candidate Desktop
 * Traceability: FR-CODE-001..014, FR-SQL-001..005, FR-ANS-005, UC-11, Rule 2, Rule 8
 */

export type SupportedLanguage = 'python' | 'javascript' | 'java' | 'c' | 'cpp';

export type ExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_EVALUATION_ERROR';

export type TestCaseVisibility = 'SAMPLE' | 'HIDDEN';

export interface SampleTestCase {
  id: string;
  name?: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface SampleCaseResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean;
  status: ExecutionStatus;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  errorMessage?: string;
}

export interface CodeRunResponse {
  status: ExecutionStatus;
  totalSampleCases: number;
  passedSampleCases: number;
  sampleResults: SampleCaseResult[];
  compilerOutput?: string;
  runtimeError?: string;
  executionTimeMs: number;
  remainingSubmissions?: number;
  maxSubmissions?: number;
  correlationId: string;
}

export interface SqlRunResponse {
  status: ExecutionStatus;
  isMatch: boolean;
  rowCount: number;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  executionTimeMs: number;
  error?: string;
  remainingSubmissions?: number;
  maxSubmissions?: number;
  correlationId: string;
}

export interface DraftAutosaveState {
  lastSavedAt: string | null;
  isSaving: boolean;
  error: string | null;
}

export interface CodingQuestionDetails {
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string[];
  sampleCases: SampleTestCase[];
  allowedLanguages?: SupportedLanguage[];
  defaultLanguage?: SupportedLanguage;
  starterTemplates?: Record<SupportedLanguage, string>;
  maxSubmissions?: number;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface SqlQuestionDetails {
  statement: string;
  schemaDdl: string;
  seedDataSql?: string;
  sampleExpectedRows?: Array<Record<string, unknown>>;
  maxSubmissions?: number;
  comparisonMode?: 'EXACT_MATCH' | 'UNORDERED_MATCH';
}
