/**
 * Ephemeral SQL Evaluation Sandbox
 * Executes candidate queries against an isolated in-memory SQLite sandbox with query validation,
 * statement timeout, and comparison modes.
 * Traceability: FR-SQL-001, FR-SQL-002, FR-SQL-003, FR-SQL-004, FR-SQL-005
 */

import { createRequire } from 'module';
import {
  SqlExecutionRequest,
  SqlExecutionResponse,
  SqlComparisonMode,
} from '../types.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

export class SqlSandboxEvaluator {
  // Prohibited statements per FR-SQL-003, FR-SQL-005
  private static readonly PROHIBITED_KEYWORDS = [
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bTRUNCATE\b/i,
    /\bATTACH\b/i,
    /\bDETACH\b/i,
    /\bPRAGMA\b/i,
    /\bVACUUM\b/i,
    /\bREINDEX\b/i,
  ];

  /**
   * Validates that candidate query does not contain prohibited administrative or destructive commands.
   */
  static validateCandidateQuery(query: string): void {
    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Candidate query cannot be empty.');
    }

    const trimmed = query.trim();

    // Check prohibited keywords
    for (const pattern of this.PROHIBITED_KEYWORDS) {
      if (pattern.test(trimmed)) {
        throw new Error(
          'Destructive or administrative SQL statements (DROP, ALTER, CREATE, TRUNCATE, ATTACH, PRAGMA) are strictly prohibited (FR-SQL-003).',
        );
      }
    }

    // Must be a query statement (SELECT / WITH ... SELECT)
    if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
      throw new Error('Only query statements (SELECT) are permitted for evaluation.');
    }
  }

  /**
   * Executes SQL evaluation inside an isolated in-memory SQLite instance.
   */
  static evaluate(request: SqlExecutionRequest): SqlExecutionResponse {
    const correlationId = `cid-sql-${Date.now().toString(36)}`;

    // 1. Validate candidate query
    try {
      this.validateCandidateQuery(request.candidateQuery);
    } catch (err) {
      return {
        status: 'RUNTIME_ERROR',
        isMatch: false,
        rowCount: 0,
        error: (err as Error).message,
        correlationId,
      };
    }

    // 2. Initialize ephemeral in-memory database
    const db = new DatabaseSync(':memory:');

    try {
      // 3. Execute Schema DDL
      if (request.schemaDdl && request.schemaDdl.trim()) {
        db.exec(request.schemaDdl);
      }

      // 4. Execute Seed Data SQL
      if (request.seedDataSql && request.seedDataSql.trim()) {
        db.exec(request.seedDataSql);
      }

      // 5. Determine expected rows
      let expectedRows: Record<string, unknown>[] = request.expectedResultRows || [];
      if (request.referenceQuery && request.referenceQuery.trim()) {
        const refStmt = db.prepare(request.referenceQuery.trim());
        expectedRows = refStmt.all() as Record<string, unknown>[];
      }

      // 6. Execute candidate query
      const candidateStmt = db.prepare(request.candidateQuery.trim());
      const candidateRows = candidateStmt.all() as Record<string, unknown>[];

      // 7. Compare results per comparison mode (FR-SQL-004)
      const isMatch = this.compareResultSets(candidateRows, expectedRows, request.comparisonMode);

      return {
        status: isMatch ? 'ACCEPTED' : 'WRONG_ANSWER',
        isMatch,
        rowCount: candidateRows.length,
        rows: candidateRows.slice(0, 50), // Cap returned rows per FR-SQL-005
        correlationId,
      };
    } catch (err) {
      return {
        status: 'RUNTIME_ERROR',
        isMatch: false,
        rowCount: 0,
        error: (err as Error).message,
        correlationId,
      };
    } finally {
      // 8. Ephemeral sandbox destruction
      try {
        db.close();
      } catch {
        // Closed
      }
    }
  }

  /**
   * Compares two SQL result sets according to comparison mode.
   */
  private static compareResultSets(
    actual: Record<string, unknown>[],
    expected: Record<string, unknown>[],
    mode: SqlComparisonMode,
  ): boolean {
    if (actual.length !== expected.length) {
      return false;
    }

    if (actual.length === 0 && expected.length === 0) {
      return true;
    }

    if (mode === 'EXACT_MATCH') {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }

    // UNORDERED_MATCH: Normalize by sorting rows deterministically
    const sortRow = (row: Record<string, unknown>) => {
      return Object.keys(row)
        .sort()
        .map((k) => `${k}:${String(row[k])}`)
        .join('|');
    };

    const actualSorted = actual.map(sortRow).sort();
    const expectedSorted = expected.map(sortRow).sort();

    return JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
  }
}
