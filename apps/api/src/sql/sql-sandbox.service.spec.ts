import { SqlSandboxService } from './sql-sandbox.service';
import { ExecutionStatus } from '@verisync/shared';

describe('SqlSandboxService (FR-SQL-001..005)', () => {
  let service: SqlSandboxService;

  beforeEach(() => {
    service = new SqlSandboxService();
  });

  describe('Dangerous SQL Blocking (FR-SQL-003)', () => {
    it('should block DROP statements', () => {
      const result = service.validateQuerySafety('DROP TABLE employees;');
      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('Dangerous or mutating SQL statement');
    });

    it('should block ALTER statements', () => {
      const result = service.validateQuerySafety('ALTER TABLE students ADD COLUMN grade INT;');
      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('Dangerous or mutating SQL statement');
    });

    it('should block TRUNCATE statements', () => {
      const result = service.validateQuerySafety('TRUNCATE TABLE logs;');
      expect(result.isSafe).toBe(false);
    });

    it('should block DELETE, INSERT, and UPDATE statements', () => {
      expect(service.validateQuerySafety('DELETE FROM users WHERE id = 1;').isSafe).toBe(false);
      expect(service.validateQuerySafety('INSERT INTO users VALUES (1, "hack");').isSafe).toBe(
        false,
      );
      expect(service.validateQuerySafety('UPDATE users SET role = "admin";').isSafe).toBe(false);
    });

    it('should block PRAGMA and ATTACH commands', () => {
      expect(service.validateQuerySafety('PRAGMA table_info(users);').isSafe).toBe(false);
      expect(service.validateQuerySafety('ATTACH DATABASE "/etc/passwd" AS pwn;').isSafe).toBe(
        false,
      );
    });

    it('should block multi-statement injection with semicolon chaining', () => {
      const chained = 'SELECT * FROM users; DROP TABLE users;';
      const result = service.validateQuerySafety(chained);
      expect(result.isSafe).toBe(false);
      expect(result.reason).toContain('Multiple SQL statements in a single submission are blocked');
    });

    it('should allow legitimate read-only SELECT and CTE WITH queries', () => {
      expect(
        service.validateQuerySafety('SELECT id, name FROM users WHERE score > 80;').isSafe,
      ).toBe(true);
      expect(
        service.validateQuerySafety(
          'WITH TopStudents AS (SELECT * FROM students) SELECT * FROM TopStudents;',
        ).isSafe,
      ).toBe(true);
    });
  });

  describe('Isolated Ephemeral Execution & Comparison (FR-SQL-002, FR-SQL-004, FR-SQL-005)', () => {
    const schemaSql = `
      CREATE TABLE departments (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        department_id INTEGER,
        salary REAL
      );
      INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Finance');
      INSERT INTO employees VALUES (101, 'Alice', 1, 95000), (102, 'Bob', 1, 85000), (103, 'Charlie', 2, 70000);
    `;

    it('should successfully execute query in isolated sandbox and match expected reference solution (FR-SQL-002, 005)', async () => {
      const candidateQuery =
        'SELECT name, salary FROM employees WHERE department_id = 1 ORDER BY salary DESC;';
      const referenceSolution =
        'SELECT name, salary FROM employees WHERE department_id = 1 ORDER BY salary DESC;';

      const result = await service.evaluateQuery({
        schemaSql,
        candidateQuery,
        expectedOutputOrQuery: referenceSolution,
        options: { orderedMatch: true },
      });

      expect(result.passed).toBe(true);
      expect(result.status).toBe(ExecutionStatus.ACCEPTED);
      expect(result.rowCount).toBe(2);
      expect(result.rows[0].name).toBe('Alice');
      expect(result.rows[1].name).toBe('Bob');
    });

    it('should detect wrong answer when output does not match expected output (FR-SQL-005)', async () => {
      const candidateQuery = 'SELECT name, salary FROM employees WHERE department_id = 2;';
      const referenceSolution = 'SELECT name, salary FROM employees WHERE department_id = 1;';

      const result = await service.evaluateQuery({
        schemaSql,
        candidateQuery,
        expectedOutputOrQuery: referenceSolution,
      });

      expect(result.passed).toBe(false);
      expect(result.status).toBe(ExecutionStatus.WRONG_ANSWER);
      expect(result.errorMessage).toContain('mismatched results');
    });

    it('should support unordered matching when order is arbitrary (FR-SQL-005)', async () => {
      const candidateQuery = 'SELECT name FROM employees WHERE department_id = 1;';
      const expectedJson = JSON.stringify([{ name: 'Bob' }, { name: 'Alice' }]);

      const result = await service.evaluateQuery({
        schemaSql,
        candidateQuery,
        expectedOutputOrQuery: expectedJson,
        options: { orderedMatch: false },
      });

      expect(result.passed).toBe(true);
      expect(result.status).toBe(ExecutionStatus.ACCEPTED);
    });

    it('should handle syntax errors gracefully as RUNTIME_ERROR (FR-SQL-004)', async () => {
      const candidateQuery = 'SELECT * FORM employees;'; // typo FORM

      const result = await service.evaluateQuery({
        schemaSql,
        candidateQuery,
      });

      expect(result.passed).toBe(false);
      expect(result.status).toBe(ExecutionStatus.RUNTIME_ERROR);
      expect(result.errorMessage).toContain('SQL Execution Error');
    });
  });
});
