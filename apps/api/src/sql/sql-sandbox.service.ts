import { Injectable, Logger } from '@nestjs/common';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { ExecutionStatus } from '@verisync/shared';

export interface SqlSandboxOptions {
  statementTimeoutMs?: number;
  maxRows?: number;
  orderedMatch?: boolean;
}

export interface SqlEvaluationRequest {
  schemaSql?: string;
  candidateQuery: string;
  expectedOutputOrQuery?: string;
  options?: SqlSandboxOptions;
}

export interface SqlEvaluationResult {
  passed: boolean;
  status: ExecutionStatus;
  executionTimeMs: number;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
  errorMessage?: string;
}

@Injectable()
export class SqlSandboxService {
  private readonly logger = new Logger(SqlSandboxService.name);
  private sqlJsPromise: Promise<SqlJsStatic> | null = null;

  private readonly DEFAULT_TIMEOUT_MS = 3000;
  private readonly DEFAULT_MAX_ROWS = 100;

  // Forbidden dangerous SQL commands (FR-SQL-003)
  private readonly FORBIDDEN_COMMANDS_REGEX =
    /\b(DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|GRANT|REVOKE|ATTACH|DETACH|PRAGMA|REINDEX|VACUUM|CREATE|REPLACE|UPSERT|MERGE|LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE|EXEC|EXECUTE|SYSTEM)\b/i;

  constructor() {
    this.initSql();
  }

  private async initSql(): Promise<SqlJsStatic> {
    if (!this.sqlJsPromise) {
      this.sqlJsPromise = initSqlJs();
    }
    return this.sqlJsPromise;
  }

  /**
   * Validates that query does not contain prohibited dangerous statements (FR-SQL-003)
   */
  validateQuerySafety(query: string): { isSafe: boolean; reason?: string } {
    if (!query || typeof query !== 'string') {
      return { isSafe: false, reason: 'Query cannot be empty.' };
    }

    const trimmed = query.trim();

    // 1. Multi-statement injection prevention (FR-SQL-003)
    const sanitizedStatements = trimmed
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sanitizedStatements.length > 1) {
      return {
        isSafe: false,
        reason: 'Multiple SQL statements in a single submission are blocked (FR-SQL-003).',
      };
    }

    // 2. Check for dangerous/mutating keywords anywhere in the statement (FR-SQL-003)
    const match = trimmed.match(this.FORBIDDEN_COMMANDS_REGEX);
    if (match) {
      return {
        isSafe: false,
        reason: `Dangerous or mutating SQL statement '${match[0].toUpperCase()}' is blocked (FR-SQL-003).`,
      };
    }

    // 3. Must be a read-only query starting with SELECT or WITH
    if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
      return {
        isSafe: false,
        reason:
          'Only read-only SELECT or CTE (WITH ... SELECT) queries are permitted (FR-SQL-003).',
      };
    }

    return { isSafe: true };
  }

  /**
   * Executes query in an isolated ephemeral database and evaluates against expected output (FR-SQL-002..005)
   */
  async evaluateQuery(request: SqlEvaluationRequest): Promise<SqlEvaluationResult> {
    const startTime = Date.now();
    const timeoutMs = request.options?.statementTimeoutMs ?? this.DEFAULT_TIMEOUT_MS;
    const maxRows = request.options?.maxRows ?? this.DEFAULT_MAX_ROWS;
    const orderedMatch = request.options?.orderedMatch ?? false;

    // 1. Static security validation (FR-SQL-003)
    const safetyCheck = this.validateQuerySafety(request.candidateQuery);
    if (!safetyCheck.isSafe) {
      return {
        passed: false,
        status: ExecutionStatus.COMPILATION_ERROR,
        executionTimeMs: Date.now() - startTime,
        rowCount: 0,
        columns: [],
        rows: [],
        errorMessage: safetyCheck.reason,
      };
    }

    let db: Database | null = null;
    try {
      const SQL = await this.initSql();

      // 2. Create isolated ephemeral in-memory database instance (FR-SQL-002)
      db = new SQL.Database();

      // Seed schema and data if provided (FR-SQL-001)
      if (request.schemaSql && request.schemaSql.trim().length > 0) {
        db.run(request.schemaSql);
      }

      // 3. Execute candidate query with statement timeout bounds (FR-SQL-004)
      const executionStart = Date.now();
      const results = db.exec(request.candidateQuery);
      const executionTimeMs = Date.now() - executionStart;

      if (executionTimeMs > timeoutMs) {
        return {
          passed: false,
          status: ExecutionStatus.TIME_LIMIT_EXCEEDED,
          executionTimeMs,
          rowCount: 0,
          columns: [],
          rows: [],
          errorMessage: `Query execution exceeded timeout limit of ${timeoutMs}ms (FR-SQL-004).`,
        };
      }

      const queryOutput = results[0];
      const columns = queryOutput?.columns || [];
      let rawRows: unknown[][] = (queryOutput?.values as unknown[][]) || [];

      // Enforce max returned rows limit (FR-SQL-004)
      if (rawRows.length > maxRows) {
        rawRows = rawRows.slice(0, maxRows);
      }

      const rows: Record<string, unknown>[] = rawRows.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          obj[col.toLowerCase()] = row[idx];
        });
        return obj;
      });

      // 4. Compare with expected output or reference query (FR-SQL-005)
      let expectedRows: Record<string, unknown>[] = [];
      if (request.expectedOutputOrQuery) {
        const expected = request.expectedOutputOrQuery.trim();
        if (expected.startsWith('[') || expected.startsWith('{')) {
          try {
            const parsed = JSON.parse(expected);
            expectedRows = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            expectedRows = [];
          }
        } else if (/^\s*(SELECT|WITH)\b/i.test(expected)) {
          // Execute reference solution query in same ephemeral sandbox
          const refResult = db.exec(expected);
          const refOutput = refResult[0];
          const refCols = refOutput?.columns || [];
          const refVals = refOutput?.values || [];
          expectedRows = refVals.map((r) => {
            const o: Record<string, unknown> = {};
            refCols.forEach((c, i) => {
              o[c.toLowerCase()] = r[i];
            });
            return o;
          });
        }
      }

      const isMatch = this.compareResultSets(rows, expectedRows, orderedMatch);

      return {
        passed: isMatch,
        status: isMatch ? ExecutionStatus.ACCEPTED : ExecutionStatus.WRONG_ANSWER,
        executionTimeMs,
        rowCount: rows.length,
        columns,
        rows,
        errorMessage: isMatch
          ? undefined
          : 'Query returned mismatched results against expected output.',
      };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[SqlSandboxService] Candidate query error: ${errMessage}`);
      return {
        passed: false,
        status: ExecutionStatus.RUNTIME_ERROR,
        executionTimeMs: Date.now() - startTime,
        rowCount: 0,
        columns: [],
        rows: [],
        errorMessage: `SQL Execution Error: ${errMessage}`,
      };
    } finally {
      if (db) {
        try {
          db.close();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  /**
   * Compares candidate row results with expected dataset (FR-SQL-005)
   */
  compareResultSets(
    actual: Record<string, unknown>[],
    expected: Record<string, unknown>[],
    ordered: boolean,
  ): boolean {
    if (expected.length === 0 && actual.length === 0) {
      return true;
    }
    if (expected.length !== actual.length) {
      return false;
    }

    const normalizeRow = (row: Record<string, unknown>): string => {
      const sortedKeys = Object.keys(row).sort();
      const normalized: Record<string, unknown> = {};
      for (const k of sortedKeys) {
        let val = row[k];
        if (typeof val === 'number') {
          // Round numbers to 4 decimal places for floating point comparison
          val = Number(val.toFixed(4));
        } else if (typeof val === 'string') {
          val = val.trim();
        }
        normalized[k.toLowerCase()] = val;
      }
      return JSON.stringify(normalized);
    };

    if (ordered) {
      for (let i = 0; i < actual.length; i++) {
        if (normalizeRow(actual[i]) !== normalizeRow(expected[i])) {
          return false;
        }
      }
      return true;
    } else {
      // Unordered matching: sort normalized representations and compare
      const actualSorted = actual.map(normalizeRow).sort();
      const expectedSorted = expected.map(normalizeRow).sort();
      for (let i = 0; i < actualSorted.length; i++) {
        if (actualSorted[i] !== expectedSorted[i]) {
          return false;
        }
      }
      return true;
    }
  }
}
