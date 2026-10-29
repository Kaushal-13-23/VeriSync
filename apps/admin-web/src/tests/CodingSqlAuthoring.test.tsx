/**
 * Coding & SQL Question Authoring Test Suite
 * Traceability: FR-QB-001..010, FR-CODE-001..010, FR-SQL-001..005, Rule 2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionFormModal } from '../components/questions/QuestionFormModal';
import { QuestionInput } from '../types/api';

describe('Coding & SQL Question Authoring UI (FR-CODE, FR-SQL)', () => {
  const defaultTopicOptions = ['Data Structures', 'Algorithms', 'Databases', 'System Design'];

  it('renders and authors a complete Coding Sandbox question with test cases and resource limits', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <QuestionFormModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        topicOptions={defaultTopicOptions}
      />,
    );

    // 1. Switch to Coding Sandbox type
    fireEvent.click(screen.getByTestId('type-btn-CODING'));

    // Verify coding configuration header appears
    expect(screen.getByText(/Coding Sandbox Configuration/i)).toBeInTheDocument();

    // Verify language checkboxes are available
    expect(screen.getByTestId('checkbox-lang-python')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-lang-javascript')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-lang-c')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-lang-cpp')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-lang-java')).toBeInTheDocument();

    // Verify execution limits inputs
    expect(screen.getByTestId('input-time-limit-ms')).toHaveValue(2000);
    expect(screen.getByTestId('input-memory-limit-mb')).toHaveValue(256);
    expect(screen.getByTestId('input-max-submissions')).toHaveValue(5);

    // 2. Fill question prompt
    fireEvent.change(screen.getByTestId('textarea-question-text'), {
      target: { value: 'Given an array of integers, return the sum of all positive numbers.' },
    });

    // Adjust limits
    fireEvent.change(screen.getByTestId('input-time-limit-ms'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByTestId('input-max-submissions'), {
      target: { value: '3' },
    });

    // 3. Edit sample test case
    fireEvent.change(screen.getByTestId('input-sample-stdin-0'), {
      target: { value: '1 -4 7 12\n' },
    });
    fireEvent.change(screen.getByTestId('input-sample-stdout-0'), {
      target: { value: '20' },
    });

    // 4. Edit hidden test case
    fireEvent.change(screen.getByTestId('input-hidden-stdin-0'), {
      target: { value: '-1 -2 -3\n' },
    });
    fireEvent.change(screen.getByTestId('input-hidden-stdout-0'), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByTestId('input-hidden-marks-0'), {
      target: { value: '10' },
    });

    // 5. Submit form
    fireEvent.click(screen.getByTestId('btn-submit-question'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData: QuestionInput = handleSubmit.mock.calls[0][0];
    expect(submittedData.questionType).toBe('CODING');
    expect(submittedData.questionText).toContain('return the sum of all positive numbers');
    expect(submittedData.codingConfig).toBeDefined();
    expect(submittedData.codingConfig?.timeLimitMs).toBe(1500);
    expect(submittedData.codingConfig?.maxSubmissions).toBe(3);
    expect(submittedData.codingConfig?.allowedLanguages).toContain('python');
    expect(submittedData.testCases).toHaveLength(2);

    // Verify sample vs hidden visibility
    const sample = submittedData.testCases?.find((tc) => tc.visibility === 'SAMPLE');
    expect(sample?.expectedOutput).toBe('20');
    const hidden = submittedData.testCases?.find((tc) => tc.visibility === 'HIDDEN');
    expect(hidden?.marks).toBe(10);
    expect(hidden?.expectedOutput).toBe('0');
  });

  it('renders and authors a complete SQL Query Sandbox question with DDL and comparison mode', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <QuestionFormModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        topicOptions={defaultTopicOptions}
      />,
    );

    // 1. Switch to SQL Sandbox type
    fireEvent.click(screen.getByTestId('type-btn-SQL'));

    // Verify SQL configuration section
    expect(screen.getByText(/SQL Sandbox Configuration/i)).toBeInTheDocument();
    expect(screen.getByTestId('textarea-sql-schema-ddl')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-sql-seed-data')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-sql-reference-query')).toBeInTheDocument();
    expect(screen.getByTestId('select-sql-comparison-mode')).toBeInTheDocument();

    // 2. Fill details
    fireEvent.change(screen.getByTestId('textarea-question-text'), {
      target: { value: 'Write a query to calculate average salary for each department.' },
    });

    fireEvent.change(screen.getByTestId('select-sql-comparison-mode'), {
      target: { value: 'UNORDERED_MATCH' },
    });

    // 3. Submit
    fireEvent.click(screen.getByTestId('btn-submit-question'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData: QuestionInput = handleSubmit.mock.calls[0][0];
    expect(submittedData.questionType).toBe('SQL');
    expect(submittedData.sqlConfig).toBeDefined();
    expect(submittedData.sqlConfig?.comparisonMode).toBe('UNORDERED_MATCH');
    expect(submittedData.sqlConfig?.schemaDdl).toContain('CREATE TABLE');
    expect(submittedData.sqlConfig?.referenceQuery).toContain('SELECT');
  });

  it('validates mandatory schema and reference query for SQL questions', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <QuestionFormModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        topicOptions={defaultTopicOptions}
      />,
    );

    // Switch to SQL
    fireEvent.click(screen.getByTestId('type-btn-SQL'));

    // Clear required fields
    fireEvent.change(screen.getByTestId('textarea-question-text'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('textarea-sql-schema-ddl'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('textarea-sql-reference-query'), { target: { value: '' } });

    // Try submit
    fireEvent.click(screen.getByTestId('btn-submit-question'));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Question prompt statement is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Schema DDL statement is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Reference SQL query is required/i)).toBeInTheDocument();
  });
});
