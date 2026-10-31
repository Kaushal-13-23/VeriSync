import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SqlRenderer } from '../renderers/SqlRenderer';
import { SqlQuestionDetails } from '../../../types/codeRunner';
import { codeRunnerService } from '../../../services/codeRunnerService';

const mockSqlDetails: SqlQuestionDetails = {
  statement: 'Report the second highest salary from the Employee table.',
  schemaDdl: 'CREATE TABLE Employee (id INT PRIMARY KEY, name VARCHAR(50), salary INT);',
  seedDataSql: "INSERT INTO Employee VALUES (1, 'Alice', 95000), (2, 'Bob', 120000);",
  sampleExpectedRows: [{ SecondHighestSalary: 95000 }],
  maxSubmissions: 3,
  comparisonMode: 'EXACT_MATCH',
};

describe('SqlRenderer Component (FR-SQL-001..005, UC-11)', () => {
  beforeEach(() => {
    codeRunnerService.resetSubmissions('test-sql-01');
  });

  it('renders SQL problem statement, table definition, and schema tabs', () => {
    render(
      <SqlRenderer
        questionId="test-sql-01"
        details={mockSqlDetails}
        value="SELECT MAX(salary) FROM Employee;"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Report the second highest salary/i)).toBeInTheDocument();
    expect(screen.getByText(/CREATE TABLE Employee/i)).toBeInTheDocument();
  });

  it('executes SELECT query and renders results table grid with column headers and rows', async () => {
    render(
      <SqlRenderer
        questionId="test-sql-01"
        details={mockSqlDetails}
        value="SELECT MAX(salary) AS SecondHighestSalary FROM Employee;"
        onChange={vi.fn()}
      />,
    );

    const runBtn = screen.getByRole('button', { name: /Execute SQL Query/i });
    expect(runBtn).toBeInTheDocument();

    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /SQL Output Table/i })).toBeInTheDocument();
      expect(screen.getByText('SecondHighestSalary')).toBeInTheDocument();
      expect(screen.getByText('95000')).toBeInTheDocument();
      expect(screen.getByText(/1 rows returned/i)).toBeInTheDocument();
    });
  });

  it('blocks dangerous SQL commands like DROP, ALTER, TRUNCATE with security error (FR-SQL-003)', async () => {
    render(
      <SqlRenderer
        questionId="test-sql-01"
        details={mockSqlDetails}
        value="DROP TABLE Employee;"
        onChange={vi.fn()}
      />,
    );

    const runBtn = screen.getByRole('button', { name: /Execute SQL Query/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Dangerous SQL command 'DROP' is prohibited/i)).toBeInTheDocument();
    });
  });
});
