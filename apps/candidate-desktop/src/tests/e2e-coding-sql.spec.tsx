import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamScreen } from '../screens/ExamScreen';
import { mockApi, MockAssessmentSession } from '../services/mockApi';
import { apiClient } from '../services/apiClient';

describe('Phase 5 E2E Exam Runtime: Coding and SQL Assessment (FR-CODE, FR-SQL, UC-11)', () => {
  let session: MockAssessmentSession;

  beforeEach(() => {
    // Reset mock session and initialize with questions including coding and SQL
    session = mockApi.initMockSession('CAN-2026-081', 'asmt-code-sql-01');
    vi.spyOn(apiClient, 'saveDraft').mockResolvedValue({ success: true });
  });

  it('navigates through MCQ questions to Coding question, executes sample cases, and submits answer', async () => {
    const onFinishExam = vi.fn();

    // Set starting question index to 4 (Question 5 is Coding)
    session.currentQuestionIndex = 4;

    render(<ExamScreen session={session} onFinishExam={onFinishExam} />);

    // 1. Verify Coding Question Renderer is displayed
    await waitFor(() => {
      expect(screen.getByTestId('coding-renderer')).toBeInTheDocument();
      expect(screen.getByText(/Write a function sum_primes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Programming Language/i)).toBeInTheDocument();
    });

    // 2. Run sample test cases
    const runCodeBtn = screen.getByRole('button', { name: /Run Code against Sample Cases/i });
    expect(runCodeBtn).toBeInTheDocument();
    fireEvent.click(runCodeBtn);

    // 3. Verify sample results in console
    await waitFor(() => {
      expect(screen.getByText(/ACCEPTED/i)).toBeInTheDocument();
      expect(screen.getByText(/Sample Cases Passed/i)).toBeInTheDocument();
    });

    // 4. Verify draft autosave indicator
    expect(screen.getByText(/Draft autosaves every 10s/i)).toBeInTheDocument();

    // 5. Submit Coding answer and advance to Question 6 (SQL)
    const submitNextBtn = screen.getByRole('button', { name: /Submit & Next/i });
    fireEvent.click(submitNextBtn);

    // 6. Verify transition to Question 6 (SQL)
    await waitFor(() => {
      expect(screen.getByTestId('sql-renderer')).toBeInTheDocument();
      expect(screen.getByText(/Report the second highest salary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/SQL Editor Input/i)).toBeInTheDocument();
    });

    // 7. Execute SQL Query
    const runSqlBtn = screen.getByRole('button', { name: /Execute SQL Query/i });
    fireEvent.click(runSqlBtn);

    // 8. Verify SQL Output Table Grid
    await waitFor(() => {
      expect(screen.getByRole('table', { name: /SQL Output Table/i })).toBeInTheDocument();
      expect(screen.getByText('SecondHighestSalary')).toBeInTheDocument();
    });

    // 9. Submit final SQL answer and trigger end test modal (on last question, text is 'Submit Assessment')
    const finalSubmitBtn = screen.getByRole('button', { name: /Submit Assessment/i });
    fireEvent.click(finalSubmitBtn);

    // 10. Confirm End Test
    await waitFor(
      () => {
        expect(screen.getByText(/End Assessment Confirmation/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const confirmSubmitBtn = screen.getByRole('button', { name: /Confirm & End Test/i });
    fireEvent.click(confirmSubmitBtn);

    await waitFor(() => {
      expect(onFinishExam).toHaveBeenCalled();
    });
  });
});
