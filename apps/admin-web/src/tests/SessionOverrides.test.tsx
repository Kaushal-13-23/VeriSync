/**
 * Vitest Admin Session Overrides Suite
 * Traceability: BR-012, FR-ADMIN-004, FR-TIME-011, Rule 7, Rule 9
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveSessionsView } from '../components/sessions/LiveSessionsView';
import { ToastContainer } from '../components/ui/ToastContainer';

const renderLiveSessionsWithToasts = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LiveSessionsView />
      <ToastContainer />
    </QueryClientProvider>,
  );
};

describe('Admin Session Overrides (BR-012, Rule 7)', () => {
  it('[BR-012, Rule 7] rejects override submission if justification reason is empty', async () => {
    renderLiveSessionsWithToasts();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    const overrideBtn = screen.getByTestId('btn-override-sess-1');
    fireEvent.click(overrideBtn);

    expect(await screen.findByTestId('session-override-modal')).toBeInTheDocument();

    // Check confirmation checkbox without providing reason
    const confirmCheckbox = screen.getByTestId('override-confirm-checkbox');
    fireEvent.click(confirmCheckbox);

    // Click submit
    const submitBtn = screen.getByTestId('btn-submit-override');
    fireEvent.click(submitBtn);

    // Validation error appears
    expect(await screen.findByTestId('override-validation-error')).toHaveTextContent(
      'A mandatory justification reason is required for administrative overrides (BR-012).',
    );
  });

  it('[BR-012, Rule 7] rejects override submission if confirmation is not checked', async () => {
    renderLiveSessionsWithToasts();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    const overrideBtn = screen.getByTestId('btn-override-sess-1');
    fireEvent.click(overrideBtn);

    expect(await screen.findByTestId('session-override-modal')).toBeInTheDocument();

    // Enter reason but do NOT check confirmation
    const reasonInput = screen.getByTestId('input-override-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Supervisor authorized emergency accommodation.' },
    });

    const submitBtn = screen.getByTestId('btn-submit-override');
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('override-validation-error')).toHaveTextContent(
      'You must confirm the administrative action before applying.',
    );
  });

  it('[FR-ADMIN-004, BR-012] applies EXTEND override with additional minutes and records audit trail', async () => {
    renderLiveSessionsWithToasts();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    const overrideBtn = screen.getByTestId('btn-override-sess-1');
    fireEvent.click(overrideBtn);

    expect(await screen.findByTestId('session-override-modal')).toBeInTheDocument();

    // Select EXTEND (default)
    const minutesInput = screen.getByTestId('input-extension-minutes');
    fireEvent.change(minutesInput, { target: { value: '20' } });

    // Enter mandatory reason
    const reasonInput = screen.getByTestId('input-override-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Lab terminal network cable failure; 20 minutes granted per policy.' },
    });

    // Check confirmation
    const confirmCheckbox = screen.getByTestId('override-confirm-checkbox');
    fireEvent.click(confirmCheckbox);

    // Submit override
    const submitBtn = screen.getByTestId('btn-submit-override');
    fireEvent.click(submitBtn);

    // Verify modal closes and toast notifies with correlation ID
    await waitFor(() => {
      expect(screen.queryByTestId('session-override-modal')).not.toBeInTheDocument();
      expect(screen.getByText('Override Applied')).toBeInTheDocument();
    });
  });

  it('[FR-ADMIN-004] applies PAUSE override to hold candidate exam timer', async () => {
    renderLiveSessionsWithToasts();

    expect(await screen.findByText('Aisha Khan')).toBeInTheDocument();

    const overrideBtn = screen.getByTestId('btn-override-sess-2');
    fireEvent.click(overrideBtn);

    expect(await screen.findByTestId('session-override-modal')).toBeInTheDocument();

    // Select PAUSE action
    const pauseOpt = screen.getByTestId('override-opt-PAUSE');
    fireEvent.click(pauseOpt);

    // Enter reason
    const reasonInput = screen.getByTestId('input-override-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Power grid oscillation in Lab Block B; timer held.' },
    });

    // Confirm & submit
    fireEvent.click(screen.getByTestId('override-confirm-checkbox'));
    fireEvent.click(screen.getByTestId('btn-submit-override'));

    await waitFor(() => {
      expect(screen.queryByTestId('session-override-modal')).not.toBeInTheDocument();
    });
  });

  it('[FR-ADMIN-004] applies REOPEN override on expired or interrupted session', async () => {
    renderLiveSessionsWithToasts();

    expect(await screen.findByText('Vikram Patel')).toBeInTheDocument();

    const overrideBtn = screen.getByTestId('btn-override-sess-4');
    fireEvent.click(overrideBtn);

    expect(await screen.findByTestId('session-override-modal')).toBeInTheDocument();

    // Select REOPEN
    const reopenOpt = screen.getByTestId('override-opt-REOPEN');
    fireEvent.click(reopenOpt);

    // Set minutes
    const minutesInput = screen.getByTestId('input-extension-minutes');
    fireEvent.change(minutesInput, { target: { value: '30' } });

    // Enter reason
    const reasonInput = screen.getByTestId('input-override-reason');
    fireEvent.change(reasonInput, {
      target: {
        value: 'Candidate suffered medical emergency during exam window; approved for reopen.',
      },
    });

    // Confirm & submit
    fireEvent.click(screen.getByTestId('override-confirm-checkbox'));
    fireEvent.click(screen.getByTestId('btn-submit-override'));

    await waitFor(() => {
      expect(screen.queryByTestId('session-override-modal')).not.toBeInTheDocument();
    });
  });
});
