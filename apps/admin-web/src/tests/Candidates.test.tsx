/**
 * Vitest Candidate Management Suite
 * Traceability: FR-CAN-001..007, FR-AUTH-005, FR-AUTH-009, Rule 1, Rule 6, UI_Sample.jpeg
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CandidatesView } from '../components/candidates/CandidatesView';

const renderCandidatesView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CandidatesView />
    </QueryClientProvider>,
  );
};

describe('Candidates Management View', () => {
  it('[FR-CAN-001] renders candidate roster table with ID, status chips, and test assignments', async () => {
    renderCandidatesView();

    expect(await screen.findByText('CAN-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    expect(screen.getByText('rohan.mehta@nitk.edu.in')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-CAN-2026-001')).toHaveTextContent('Active');

    // UI Sample: Showing 1-6 of N candidates
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1-6 of');
  });

  it('[FR-CAN-001] filters candidates by keyword search', async () => {
    renderCandidatesView();

    expect(await screen.findByText('CAN-2026-001')).toBeInTheDocument();

    const searchInput = screen.getByTestId('candidate-search-input');
    fireEvent.change(searchInput, { target: { value: 'Aisha' } });

    await waitFor(() => {
      expect(screen.getByText('Aisha Khan')).toBeInTheDocument();
      expect(screen.queryByText('Rohan Mehta')).not.toBeInTheDocument();
    });
  });

  it('[FR-CAN-002, FR-AUTH-005] opens Add Candidate modal and creates candidate with temporary password', async () => {
    renderCandidatesView();

    const addBtn = await screen.findByTestId('add-candidate-btn');
    fireEvent.click(addBtn);

    expect(screen.getByTestId('candidate-form-modal')).toBeInTheDocument();
    expect(screen.getByText('Add New Candidate')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId('input-full-name'), {
      target: { value: 'Test Student' },
    });
    fireEvent.change(screen.getByTestId('input-email'), {
      target: { value: 'test.student@univ.edu' },
    });
    fireEvent.change(screen.getByTestId('input-institution'), {
      target: { value: 'National University' },
    });
    fireEvent.change(screen.getByTestId('input-qualification'), {
      target: { value: 'B.Tech IT' },
    });

    // Submit registration
    fireEvent.click(screen.getByTestId('modal-submit-btn'));

    // Displays one-time generated password (FR-AUTH-005)
    expect(await screen.findByTestId('temp-password-value')).toBeInTheDocument();
    expect(screen.getByTestId('copy-credentials-btn')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('modal-done-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('candidate-form-modal')).not.toBeInTheDocument();
    });
  });

  it('[FR-CAN-006] opens candidate detail drawer displaying login history and assigned tests', async () => {
    renderCandidatesView();

    const viewBtn = await screen.findByTestId('btn-view-CAN-2026-001');
    fireEvent.click(viewBtn);

    expect(await screen.findByTestId('candidate-detail-drawer')).toBeInTheDocument();
    expect(await screen.findByTestId('drawer-overview-panel')).toBeInTheDocument();

    // Switch to security tab (login history)
    fireEvent.click(screen.getByTestId('drawer-tab-security'));
    expect(await screen.findByTestId('drawer-security-panel')).toBeInTheDocument();
    expect(screen.getAllByText('192.168.1.105').length).toBeGreaterThan(0);

    // Close drawer
    fireEvent.click(screen.getByTestId('drawer-close-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('candidate-detail-drawer')).not.toBeInTheDocument();
    });
  });

  it('[FR-CAN-005] deactivates an active candidate account with confirmation', async () => {
    renderCandidatesView();

    const toggleBtn = await screen.findByTestId('btn-toggle-CAN-2026-001');
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('toggle-status-modal')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Candidate Account?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-confirm-toggle-status'));

    await waitFor(() => {
      expect(screen.queryByTestId('toggle-status-modal')).not.toBeInTheDocument();
    });
  });

  it('[FR-AUTH-005, FR-AUTH-009] resets candidate password and presents copyable temporary password', async () => {
    renderCandidatesView();

    const resetBtn = await screen.findByTestId('btn-reset-pw-CAN-2026-001');
    fireEvent.click(resetBtn);

    expect(screen.getByTestId('reset-password-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-confirm-reset-pw'));

    expect(await screen.findByTestId('generated-temp-password')).toBeInTheDocument();
    expect(screen.getByTestId('btn-copy-temp-password')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-close-reset-modal'));
    await waitFor(() => {
      expect(screen.queryByTestId('reset-password-modal')).not.toBeInTheDocument();
    });
  });

  it('[FR-CAN-003] opens CSV import modal, downloads template, and handles import result error reporting', async () => {
    renderCandidatesView();

    const importBtn = await screen.findByTestId('import-csv-btn');
    fireEvent.click(importBtn);

    expect(screen.getByTestId('csv-import-modal')).toBeInTheDocument();
    expect(screen.getByTestId('btn-download-sample')).toBeInTheDocument();

    // Simulate selecting a CSV with one valid and one invalid row
    const testCsv = `candidateIdentifier,fullName,username,email,phone,institution,qualification,graduationYear,recruitmentReference
CAN-2026-999,Valid Student,valid.student,valid@univ.edu,+91 9999900000,Univ,B.Tech,2026,Autumn Campus 2026
,Invalid Student,inv,,+91 9999900001,Univ,B.Tech,2026,Autumn Campus 2026`;

    const file = new File([testCsv], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('csv-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for file text parsing
    await waitFor(() => {
      expect(screen.getByTestId('btn-submit-csv')).not.toBeDisabled();
    });

    // Submit import
    fireEvent.click(screen.getByTestId('btn-submit-csv'));

    // Verify error reporting screen
    expect(await screen.findByTestId('csv-results-view')).toBeInTheDocument();
    expect(screen.getByTestId('imported-count')).toHaveTextContent('1');
    expect(screen.getByTestId('error-count')).toHaveTextContent('1');
    expect(screen.getByTestId('btn-download-error-report')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-close-import'));
    await waitFor(() => {
      expect(screen.queryByTestId('csv-import-modal')).not.toBeInTheDocument();
    });
  });
});
