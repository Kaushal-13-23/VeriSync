/**
 * Vitest Score Correction Suite
 * Traceability: BR-012, FR-SCORE-010, Rule 7, Rule 9, UC-15
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

describe('Score Correction Workflow (BR-012, FR-SCORE-010, Rule 7, UC-15)', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('[BR-012, Rule 7, UC-15] blocks score correction submission when justification reason is empty', async () => {
    renderResultsView();

    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 3000 })).toBeInTheDocument();

    // Click "Correct" button on first candidate row
    const correctButtons = screen.getAllByRole('button', { name: /Correct/i });
    fireEvent.click(correctButtons[0]);

    // Modal opens
    expect(await screen.findByText('Score Correction Workflow')).toBeInTheDocument();
    expect(screen.getByText(/Mandatory justification logged to immutable audit trail/i)).toBeInTheDocument();

    // Attempt submission without entering reason or confirming
    const submitButton = screen.getByRole('button', { name: /Confirm Score Correction/i });
    fireEvent.click(submitButton);

    // Form displays mandatory validation error banner
    expect(
      await screen.findByText(/Mandatory justification reason is required for administrative score correction/i),
    ).toBeInTheDocument();
  });

  it('[FR-SCORE-010, UC-15] executes score correction with valid justification reason and confirmation checkbox', async () => {
    renderResultsView();

    expect(await screen.findByText('Karan Singh', {}, { timeout: 3000 })).toBeInTheDocument();

    // Find Karan Singh's row ("Fail" with 48%)
    const correctButtons = screen.getAllByRole('button', { name: /Correct/i });
    // Click correct button for Karan Singh (index 2)
    fireEvent.click(correctButtons[2]);

    expect(await screen.findByText('Score Correction Workflow')).toBeInTheDocument();

    // Set new score to 35 (which is 70% -> PASS)
    const newScoreInput = screen.getByLabelText(/New Marks Awarded/i);
    fireEvent.change(newScoreInput, { target: { value: '35' } });

    // Enter mandatory reason
    const reasonInput = screen.getByLabelText(/Mandatory Justification Reason/i);
    fireEvent.change(reasonInput, {
      target: {
        value: 'Re-evaluated coding solution with alternative optimal approach. Awarded +11 points per updated rubric.',
      },
    });

    // Check confirmation checkbox
    const confirmCheckbox = screen.getByLabelText(/Confirm score modification audit stamp/i);
    fireEvent.click(confirmCheckbox);

    // Submit correction
    const submitButton = screen.getByRole('button', { name: /Confirm Score Correction/i });
    fireEvent.click(submitButton);

    // Success toast appears with updated score and correlation ID
    expect(
      await screen.findByText(/Score Corrected Successfully/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
