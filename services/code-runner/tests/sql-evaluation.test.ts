/**
 * SQL Sandbox Evaluation Tests
 * Traceability: FR-SQL-001..005
 */

import { describe, it, expect } from 'vitest';
import { SqlSandboxEvaluator } from '../src/sql/sql-sandbox.js';

describe('SQL Evaluation Sandbox (FR-SQL-001..005)', () => {
  const schemaDdl = `
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      salary INTEGER NOT NULL
    );
  `;

  const seedDataSql = `
    INSERT INTO employees (name, department, salary) VALUES
      ('Alice Smith', 'Engineering', 95000),
      ('Bob Jones', 'Engineering', 85000),
      ('Charlie Brown', 'HR', 65000),
      ('Diana Prince', 'Finance', 92000);
  `;

  it('correctly evaluates matching candidate query against reference query (FR-SQL-001, FR-SQL-004)', () => {
    const candidateQuery = `
      SELECT department, COUNT(*) as emp_count
      FROM employees
      GROUP BY department
      ORDER BY department ASC;
    `;

    const referenceQuery = `
      SELECT department, COUNT(*) as emp_count
      FROM employees
      GROUP BY department
      ORDER BY department ASC;
    `;

    const result = SqlSandboxEvaluator.evaluate({
      schemaDdl,
      seedDataSql,
      candidateQuery,
      referenceQuery,
      comparisonMode: 'EXACT_MATCH',
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.isMatch).toBe(true);
    expect(result.rowCount).toBe(3);
    expect(result.rows).toHaveLength(3);
  });

  it('supports UNORDERED_MATCH comparison mode (FR-SQL-004)', () => {
    // Candidate query does not sort rows
    const candidateQuery = `
      SELECT name, department FROM employees WHERE department = 'Engineering';
    `;

    // Reference query returns same rows in different order
    const referenceQuery = `
      SELECT name, department FROM employees WHERE department = 'Engineering' ORDER BY name DESC;
    `;

    const result = SqlSandboxEvaluator.evaluate({
      schemaDdl,
      seedDataSql,
      candidateQuery,
      referenceQuery,
      comparisonMode: 'UNORDERED_MATCH',
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.isMatch).toBe(true);
  });

  it('detects and reports WRONG_ANSWER when query outputs mismatch (FR-SQL-004)', () => {
    const candidateQuery = `
      SELECT name FROM employees WHERE salary > 100000;
    `;

    const referenceQuery = `
      SELECT name FROM employees WHERE salary > 90000;
    `;

    const result = SqlSandboxEvaluator.evaluate({
      schemaDdl,
      seedDataSql,
      candidateQuery,
      referenceQuery,
      comparisonMode: 'EXACT_MATCH',
    });

    expect(result.status).toBe('WRONG_ANSWER');
    expect(result.isMatch).toBe(false);
  });

  it('strictly blocks dangerous and destructive SQL statements per FR-SQL-003 and FR-SQL-005', () => {
    const dangerousQueries = [
      'DROP TABLE employees;',
      'ALTER TABLE employees ADD COLUMN ssn TEXT;',
      'TRUNCATE TABLE employees;',
      'PRAGMA table_info(employees);',
      'ATTACH DATABASE "malicious.db" AS mal;',
    ];

    for (const query of dangerousQueries) {
      const result = SqlSandboxEvaluator.evaluate({
        schemaDdl,
        seedDataSql,
        candidateQuery: query,
        comparisonMode: 'EXACT_MATCH',
      });

      expect(result.status).toBe('RUNTIME_ERROR');
      expect(result.isMatch).toBe(false);
      expect(result.error).toMatch(/strictly prohibited/i);
    }
  });
});
