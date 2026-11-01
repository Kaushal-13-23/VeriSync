/**
 * Vitest Create Assessment Wizard & Assignment Suite
 * Traceability: FR-ASMT-001..008, FR-CAN-004, Decision 5, Rule 1, UI_Sample.jpeg
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssessmentsView } from '../components/assessments/AssessmentsView';

const renderAssessmentsView = () => {
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
    </QueryClientProvider>,
  );
};

describe('Assessments View & Create Wizard', () => {
  it('[FR-ASMT-001, FR-ASMT-006] renders assessments catalog list with status chips and candidate counts', async () => {
    renderAssessmentsView();

    expect(await screen.findByText('Frontend Developer Test')).toBeInTheDocument();
    expect(screen.getByText('Data Analyst Assessment')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-asmt-01')).toHaveTextContent('Scheduled');
    expect(screen.getByTestId('status-badge-asmt-02')).toHaveTextContent('Active');
    expect(screen.getByText('24 candidates assigned')).toBeInTheDocument();
  });

  it('[FR-ASMT-001..004, Decision 5] completes 4-step wizard and saves draft assessment', async () => {
    renderAssessmentsView();

    const createBtn = await screen.findByTestId('btn-create-assessment');
    fireEvent.click(createBtn);

    expect(await screen.findByTestId('assessment-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('step-basic-details')).toBeInTheDocument();

    // Step 1: Fill Basic Details
    fireEvent.change(screen.getByTestId('input-assessment-title'), {
      target: { value: 'Full Stack Systems Screening' },
    });
    fireEvent.change(screen.getByTestId('input-role-category'), {
      target: { value: 'Full Stack Development' },
    });
    fireEvent.change(screen.getByTestId('input-overall-duration'), {
      target: { value: '60' },
    });

    // Advance to Step 2
    fireEvent.click(screen.getByTestId('wizard-btn-next'));
    expect(await screen.findByTestId('step-select-questions')).toBeInTheDocument();

    // Step 2: Select Questions
    const selectQ101 = await screen.findByTestId('btn-select-q-q-101');
    fireEvent.click(selectQ101);

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
    expect(screen.getByTestId('selected-q-q-101')).toBeInTheDocument();

    // Advance to Step 3
    fireEvent.click(screen.getByTestId('wizard-btn-next'));
    expect(await screen.findByTestId('step-settings')).toBeInTheDocument();

    // Step 3: Configure Settings (Decision 5)
    fireEvent.click(screen.getByTestId('toggle-negative-marking'));
    fireEvent.click(screen.getByTestId('toggle-randomize-questions'));
    fireEvent.click(screen.getByTestId('nav-mode-sequential'));

    // Advance to Step 4
    fireEvent.click(screen.getByTestId('wizard-btn-next'));
    expect(await screen.findByTestId('step-review-publish')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Systems Screening')).toBeInTheDocument();

    // Save as Draft
    fireEvent.click(screen.getByTestId('btn-save-draft'));

    await waitFor(() => {
      expect(screen.queryByTestId('assessment-wizard')).not.toBeInTheDocument();
    });
  });

  it('[Decision 5] blocks publication and warns when per-question timers exceed overall duration', async () => {
    renderAssessmentsView();

    const createBtn = await screen.findByTestId('btn-create-assessment');
    fireEvent.click(createBtn);

    // Step 1: Set duration to 2 minutes (120 seconds)
    fireEvent.change(await screen.findByTestId('input-assessment-title'), {
      target: { value: 'Strict Timing Test' },
    });
    fireEvent.change(screen.getByTestId('input-overall-duration'), {
      target: { value: '2' },
    });

    // Step 2: Select questions and set timer to 300 seconds
    fireEvent.click(screen.getByTestId('wizard-btn-next'));
    const selectQ101 = await screen.findByTestId('btn-select-q-q-101');
    fireEvent.click(selectQ101);

    const timerInput = await screen.findByTestId('input-timer-q-101');
    fireEvent.change(timerInput, { target: { value: '300' } }); // 300s > 2 mins (120s)

    // Advance through Step 3 to Step 4
    fireEvent.click(screen.getByTestId('wizard-btn-next'));
    expect(await screen.findByTestId('step-settings')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wizard-btn-next'));
    expect(await screen.findByTestId('step-review-publish')).toBeInTheDocument();

    // Blocking validation banner must be present
    expect(screen.getByTestId('duration-validation-error')).toBeInTheDocument();
    expect(screen.getByText('Duration Policy Violation')).toBeInTheDocument();

    // Buttons must be disabled
    expect(screen.getByTestId('btn-publish-wizard')).toBeDisabled();
    expect(screen.getByTestId('btn-save-draft')).toBeDisabled();
  });

  it('[FR-ASMT-003] confirms immutable snapshot freeze and publishes assessment', async () => {
    renderAssessmentsView();

    // Find Publish button for draft assessment asmt-03
    const publishBtn = await screen.findByTestId('btn-publish-asmt-03');
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(screen.getByTestId('status-badge-asmt-03')).toHaveTextContent('Scheduled');
    });
  });

  it('[FR-CAN-004] assigns candidate cohort to assessment from catalog view', async () => {
    renderAssessmentsView();

    const assignBtn = await screen.findByTestId('btn-assign-asmt-01');
    fireEvent.click(assignBtn);

    expect(await screen.findByTestId('assign-assessment-modal')).toBeInTheDocument();

    // Switch to recruitment drive cohort mode
    fireEvent.click(screen.getByTestId('btn-mode-drive'));

    // Select Autumn Campus 2026 drive cohort
    const driveBtn = await screen.findByTestId('cohort-drive-Autumn Campus 2026');
    fireEvent.click(driveBtn);

    // Confirm assignment
    fireEvent.click(screen.getByTestId('btn-confirm-assign'));

    await waitFor(() => {
      expect(screen.queryByTestId('assign-assessment-modal')).not.toBeInTheDocument();
    });
  });
});
