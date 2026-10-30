/**
 * VeriSync Coding and SQL Execution Domain Types
 * Traceability: FR-CODE-001..014, FR-SQL-001..005, NFR-SEC-008, SRS 10.4
 */

export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python' | 'javascript';

export type ExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_EVALUATION_ERROR';

export type TestCaseVisibility = 'SAMPLE' | 'HIDDEN';

export interface TestCase {
  id?: string;
  inputData: string;
  expectedOutput: string;
  visibility: TestCaseVisibility;
  marks?: number;
}

export interface TestCaseResult {
  testCaseId?: string;
  status: ExecutionStatus;
  visibility: TestCaseVisibility;
  executionTimeMs: number;
  memoryUsedKb: number;
  // Per FR-CODE-009: Actual output is ONLY provided for SAMPLE cases, NEVER for HIDDEN cases.
  actualOutput?: string;
  marksAwarded: number;
  maxMarks: number;
  errorMessage?: string;
}

export interface CodeExecutionRequest {
  sourceCode: string;
  language: SupportedLanguage;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  testCases: TestCase[];
}

export interface CodeExecutionResponse {
  status: ExecutionStatus;
  totalScore: number;
  maxScore: number;
  testCasesPassed: number;
  totalTestCases: number;
  compilerOutput?: string;
  results: TestCaseResult[];
  correlationId: string;
}

export type SqlComparisonMode = 'EXACT_MATCH' | 'UNORDERED_MATCH';

export interface SqlExecutionRequest {
  schemaDdl: string;
  seedDataSql: string;
  candidateQuery: string;
  referenceQuery?: string;
  expectedResultRows?: Record<string, unknown>[];
  comparisonMode: SqlComparisonMode;
  timeoutMs?: number;
}

export interface SqlExecutionResponse {
  status: ExecutionStatus;
  isMatch: boolean;
  rowCount: number;
  rows?: Record<string, unknown>[];
  error?: string;
  correlationId: string;
}

export interface SandboxLimits {
  timeLimitMs: number;
  memoryLimitMb: number;
  pidsLimit: number;
  maxOutputSizeBytes: number;
  maxSourceSizeBytes: number;
}
