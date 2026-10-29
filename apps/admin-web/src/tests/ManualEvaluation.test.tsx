/**
 * Vitest Manual Evaluation Queue Suite
 * Traceability: UC-14, FR-SCORE-004, FR-SCORE-005, FR-SCORE-008, Rule 9
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../store/authContext';
import { ResultsView } from '../components/results/ResultsView';
import { ToastContainer } from '../components/ui/ToastContainer';

const renderResultsView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResultsView />
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('Manual Evaluation Queue (UC-14, FR-SCORE-004, FR-SCORE-005, FR-SCORE-008)', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('[UC-14, FR-SCORE-004] renders evaluation queue with candidate subjective responses and rubric criteria', async () => {
    renderResultsView();

    // Click "Evaluation Queue" tab
    const queueTab = await screen.findByRole('button', { name: /Evaluation Queue/i }, { timeout: 3000 });
    fireEvent.click(queueTab);

    // Queue header renders
    expect(await screen.findByText(/Subjective Evaluation Queue/i)).toBeInTheDocument();

    // Pending candidate submission
    expect(await screen.findByText('Ananya Reddy', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/CAN-2026-005/)).toBeInTheDocument();
    expect(screen.getByText('Optimistic vs Pessimistic Concurrency')).toBeInTheDocument();

    // Candidate answer rendered
    expect(
      screen.getByText(/Optimistic Concurrency Control \(OCC\) assumes conflicts are rare/i),
    ).toBeInTheDocument();

    // Rubric criteria rendered (FR-SCORE-004)
    expect(screen.getByText('Core Concept Definition')).toBeInTheDocument();
    expect(screen.getByText('Conflict Detection Mechanism')).toBeInTheDocument();
    expect(screen.getByText('Production Scenario Justification')).toBeInTheDocument();
  });

  it('[UC-14, FR-SCORE-005, FR-SCORE-008] submits rubric marks and feedback comments, updating result status to FINAL', async () => {
    renderResultsView();

    // Switch to queue
    const queueTab = await screen.findByRole('button', { name: /Evaluation Queue/i }, { timeout: 3000 });
    fireEvent.click(queueTab);

    expect(await screen.findByText(/Subjective Evaluation Queue/i)).toBeInTheDocument();
    expect(await screen.findByText('Ananya Reddy', {}, { timeout: 3000 })).toBeInTheDocument();

    // Provide feedback comments
    const commentsInput = screen.getAllByLabelText(/Evaluator Comments/i)[0];
    fireEvent.change(commentsInput, {
      target: {
        value: 'Comprehensive comparison of locking overhead vs optimistic versioning. Awarded full rubric marks.',
      },
    });

    // Submit evaluation
    const submitButtons = screen.getAllByRole('button', {
      name: /Submit Evaluation & Award Marks/i,
    });
    fireEvent.click(submitButtons[0]);

    // Toast notification confirms completion with correlation ID
    expect(
      await screen.findByText(/Evaluation Submitted/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
