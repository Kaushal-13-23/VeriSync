/**
 * Vitest Assessment Status Controls Suite
 * Traceability: FR-ADMIN-005, FR-ASMT-003, Rule 7, Rule 9
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssessmentsView } from '../components/assessments/AssessmentsView';
import { ToastContainer } from '../components/ui/ToastContainer';

const renderAssessmentsWithToasts = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AssessmentsView />
      <ToastContainer />
    </QueryClientProvider>,
  );
};

describe('Assessment Lifecycle Status Controls (FR-ADMIN-005)', () => {
  it('[FR-ADMIN-005] renders Suspend button for scheduled or active assessments and opens confirmation modal', async () => {
    renderAssessmentsWithToasts();

    expect(await screen.findByText('Frontend Developer Test')).toBeInTheDocument();

    // asmt-01 is SCHEDULED, so Suspend button should be present
    const suspendBtn = screen.getByTestId('btn-suspend-asmt-01');
    expect(suspendBtn).toBeInTheDocument();

    fireEvent.click(suspendBtn);

    // Modal appears
    expect(await screen.findByTestId('assessment-status-modal')).toBeInTheDocument();
    expect(screen.getByText('Suspend Assessment')).toBeInTheDocument();
    expect(screen.getByTestId('input-status-reason')).toBeInTheDocument();
  });

  it('[FR-ADMIN-005, Rule 7] validates mandatory justification reason before status transition', async () => {
    renderAssessmentsWithToasts();

    expect(await screen.findByText('Frontend Developer Test')).toBeInTheDocument();

    const suspendBtn = screen.getByTestId('btn-suspend-asmt-01');
    fireEvent.click(suspendBtn);

    expect(await screen.findByTestId('assessment-status-modal')).toBeInTheDocument();

    // Check confirmation without entering reason
    const confirmCheckbox = screen.getByTestId('status-confirm-checkbox');
    fireEvent.click(confirmCheckbox);

    // Submit
    const confirmBtn = screen.getByTestId('btn-confirm-status');
    fireEvent.click(confirmBtn);

    expect(await screen.findByTestId('status-modal-error')).toHaveTextContent(
      'A mandatory justification reason is required for status changes (Rule 7).',
    );
  });

  it('[FR-ADMIN-005, Rule 7] updates assessment status with justification reason', async () => {
    renderAssessmentsWithToasts();

    expect(await screen.findByText('Frontend Developer Test')).toBeInTheDocument();

    const suspendBtn = screen.getByTestId('btn-suspend-asmt-01');
    fireEvent.click(suspendBtn);

    expect(await screen.findByTestId('assessment-status-modal')).toBeInTheDocument();

    // Fill reason and confirm
    const reasonInput = screen.getByTestId('input-status-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Campus network hardware replacement scheduled in Lab 4.' },
    });

    const confirmCheckbox = screen.getByTestId('status-confirm-checkbox');
    fireEvent.click(confirmCheckbox);

    const confirmBtn = screen.getByTestId('btn-confirm-status');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('assessment-status-modal')).not.toBeInTheDocument();
      expect(screen.getByText('Status Updated')).toBeInTheDocument();
    });
  });
});
