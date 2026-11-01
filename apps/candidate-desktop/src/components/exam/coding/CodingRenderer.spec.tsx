import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodingRenderer } from '../renderers/CodingRenderer';
import { CodingQuestionDetails } from '../../../types/codeRunner';
import { codeRunnerService } from '../../../services/codeRunnerService';

const mockDetails: CodingQuestionDetails = {
  statement: 'Write a function sum_primes(n) returning sum of primes <= n.',
  inputFormat: 'Integer n',
  outputFormat: 'Integer sum',
  constraints: ['1 <= n <= 1000', 'Time limit: 3000ms'],
  allowedLanguages: ['python', 'javascript', 'java'],
  defaultLanguage: 'python',
  maxSubmissions: 3,
  sampleCases: [
    {
      id: 'sc-1',
      input: 'n = 10',
      expectedOutput: '17',
      explanation: 'Primes are 2, 3, 5, 7. Sum = 17.',
    },
    {
      id: 'sc-2',
      input: 'n = 5',
      expectedOutput: '10',
      explanation: 'Primes are 2, 3, 5. Sum = 10.',
    },
  ],
  starterTemplates: {
    python: 'def sum_primes(n):\n    return 0\n',
    javascript: 'function sumPrimes(n) {\n    return 0;\n}\n',
    java: 'public class Solution {\n    public static int sumPrimes(int n) { return 0; }\n}\n',
    c: '',
    cpp: '',
  },
};

describe('CodingRenderer Component (FR-CODE-001..010, UC-11, Rule 2)', () => {
  beforeEach(() => {
    codeRunnerService.resetSubmissions('test-q-01');
  });

  it('renders problem statement, constraints, and sample test cases in problem panel', () => {
    render(
      <CodingRenderer
        questionId="test-q-01"
        details={mockDetails}
        value="def sum_primes(n):\n    return 0"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Write a function sum_primes/i)).toBeInTheDocument();
    expect(screen.getByText(/Integer n/i)).toBeInTheDocument();
    expect(screen.getByText(/1 <= n <= 1000/i)).toBeInTheDocument();
    expect(screen.getByText(/Example 1/i)).toBeInTheDocument();
    expect(screen.getByText('n = 10')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('allows language switching and updates editor template', () => {
    const handleChange = vi.fn();
    render(
      <CodingRenderer
        questionId="test-q-01"
        details={mockDetails}
        value=""
        onChange={handleChange}
      />,
    );

    const select = screen.getByLabelText(/Programming Language/i) as HTMLSelectElement;
    expect(select.value).toBe('python');

    fireEvent.change(select, { target: { value: 'javascript' } });
    expect(select.value).toBe('javascript');
  });

  it('executes sample cases via Run Code and displays results in console without revealing hidden cases (TC-10)', async () => {
    const code = 'def sum_primes(n):\n    return 17\n';
    render(
      <CodingRenderer
        questionId="test-q-01"
        details={mockDetails}
        value={code}
        onChange={vi.fn()}
      />,
    );

    const runBtn = screen.getByRole('button', { name: /Run Code against Sample Cases/i });
    expect(runBtn).toBeInTheDocument();

    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/ACCEPTED/i)).toBeInTheDocument();
      expect(screen.getByText(/Sample Cases Passed/i)).toBeInTheDocument();
    });

    // Verify hidden cases or answers are NOT shown
    expect(screen.queryByText(/hidden/i)).not.toBeInTheDocument();
  });

  it('enforces maximum submission count limits and disables execution when exhausted (FR-CODE-010)', async () => {
    render(
      <CodingRenderer
        questionId="test-q-01"
        details={mockDetails}
        value="def sum_primes(n): return 17"
        onChange={vi.fn()}
      />,
    );

    const runBtn = screen.getByRole('button', { name: /Run Code against Sample Cases/i });

    // Use all 3 allowed submissions
    fireEvent.click(runBtn);
    await waitFor(() => expect(screen.getByText(/Submissions Left: 2\/3/i)).toBeInTheDocument());

    fireEvent.click(runBtn);
    await waitFor(() => expect(screen.getByText(/Submissions Left: 1\/3/i)).toBeInTheDocument());

    fireEvent.click(runBtn);
    await waitFor(() => expect(screen.getByText(/Submissions Left: 0\/3/i)).toBeInTheDocument());

    // Button is now disabled
    expect(runBtn).toBeDisabled();
  });
});
