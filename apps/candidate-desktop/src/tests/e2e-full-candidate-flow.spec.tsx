import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';
import { mockApi } from '../services/mockApi';
import { apiClient } from '../services/apiClient';
import { tokenStorage } from '../services/tokenStorage';

/**
 * Full Candidate E2E Integration Suite (Login to Final Submit)
 * Covers:
 * - Step 1: Candidate login with credentials (FR-AUTH-002, FR-CAN-007)
 * - Step 2: System Check verification (FR-LAB-001..006)
 * - Step 3: Assigned assessments view & eligibility (FR-UI-001)
 * - Step 4: Instructions & mandatory acknowledgement (FR-UI-002, BR-015)
 * - Step 5: Examination runtime, authoritative timing & idempotent submission (FR-TIME, FR-ANS, FR-UI)
 * - Step 6: Final submission & Submitted Successfully confirmation / result visibility (FR-UI-009, FR-SCORE-008)
 */

describe('Full Candidate E2E Flow: Login to Final Submit (FR-AUTH, FR-LAB, FR-TIME, FR-ANS, FR-UI, FR-SCORE)', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    mockApi.resetStore();
    apiClient.setConfig({ forceMock: true });
    await tokenStorage.clearToken();
    await tokenStorage.clearActiveSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes full end-to-end candidate lifecycle successfully', async () => {
    render(<App />);

    // -----------------------------------------------------------------------
    // Step 1: Login Screen (FR-AUTH-002, FR-CAN-007)
    // -----------------------------------------------------------------------
    expect(screen.getAllByText('VeriSync').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Candidate ID/i)).toBeInTheDocument();

    const idInput = screen.getByLabelText(/Candidate ID/i);
    const pwdInput = screen.getByLabelText(/Password/i);
    const loginBtn = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(idInput, { target: { value: 'CAN-2026-081' } });
    fireEvent.change(pwdInput, { target: { value: 'Password123!' } });
    fireEvent.click(loginBtn);

    // -----------------------------------------------------------------------
    // Step 2: System Check Screen (FR-LAB-001..006, FR-UI-001)
    // -----------------------------------------------------------------------
    await waitFor(() => {
      expect(screen.getByText('System Check')).toBeInTheDocument();
    });

    // Wait for automated diagnostic checks to complete
    const proceedAssessmentsBtn = await screen.findByRole('button', {
      name: /Continue to Assessments/i,
    });
    expect(proceedAssessmentsBtn).toBeInTheDocument();
    fireEvent.click(proceedAssessmentsBtn);

    // -----------------------------------------------------------------------
    // Step 3: Assigned Assessments Screen (FR-UI-001, FR-ASMT-006)
    // -----------------------------------------------------------------------
    await waitFor(() => {
      expect(screen.getByText('Assigned Assessments')).toBeInTheDocument();
    });
    expect(screen.getByText(/Frontend Developer Assessment/i)).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /View Instructions & Start/i });
    fireEvent.click(startBtn);

    // -----------------------------------------------------------------------
    // Step 4: Instructions Screen (FR-UI-002, BR-015)
    // -----------------------------------------------------------------------
    await waitFor(() => {
      expect(screen.getByText('Assessment Instructions')).toBeInTheDocument();
    });
    expect(screen.getByText(/BR-015 Policy Disclosure/i)).toBeInTheDocument();

    // Check mandatory instructions acknowledgement checkbox
    const ackCheckbox = screen.getByRole('checkbox');
    expect(ackCheckbox).not.toBeChecked();
    fireEvent.click(ackCheckbox);
    expect(ackCheckbox).toBeChecked();

    const beginExamBtn = screen.getByRole('button', { name: /Start Test/i });
    expect(beginExamBtn).not.toBeDisabled();
    fireEvent.click(beginExamBtn);

    // -----------------------------------------------------------------------
    // Step 5: Exam Interface Runtime (FR-UI-003, FR-TIME-001, FR-ANS-001)
    // -----------------------------------------------------------------------
    await waitFor(() => {
      expect(screen.getByText(/Question 1 of 6/i)).toBeInTheDocument();
    });

    // Read-only question status panel rendered
    expect(screen.getByLabelText(/Question Status Palette/i)).toBeInTheDocument();

    // Select option for Question 1
    const optionLabel = await screen.findByText(/cross-browser wrappers/i);
    fireEvent.click(optionLabel);

    // Submit and Next with Idempotency-Key
    const submitBtn = screen.getByRole('button', { name: /Submit & Next/i });
    fireEvent.click(submitBtn);

    // Advances to Question 2
    await waitFor(() => {
      expect(screen.getByText(/Question 2 of 6/i)).toBeInTheDocument();
    });

    // Click End Test to finalize assessment
    const endTestBtn = screen.getByRole('button', { name: /End Test/i });
    fireEvent.click(endTestBtn);

    // Confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/End Assessment Confirmation/i)).toBeInTheDocument();
    });

    const confirmSubmitBtn = screen.getByRole('button', { name: /Confirm & End Test/i });
    fireEvent.click(confirmSubmitBtn);

    // -----------------------------------------------------------------------
    // Step 6: Submitted Successfully Screen & Results (FR-UI-009, FR-SCORE-008)
    // -----------------------------------------------------------------------
    await waitFor(() => {
      expect(screen.getByText('Test Submitted Successfully!')).toBeInTheDocument();
    });

    expect(screen.getByTestId('submission-summary-card')).toBeInTheDocument();
    expect(screen.getByText('CAN-2026-081')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close Application/i })).toBeInTheDocument();
  }, 30000);
});
