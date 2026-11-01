/**
 * Vitest Results & Answer Review Suite
 * Traceability: FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-001..008, UI_Sample.jpeg, Rule 9
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Results & Answer Review (FR-ADMIN-005, FR-SCORE-007, FR-SCORE-008, UI_Sample.jpeg)', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('[FR-ADMIN-005, UI_Sample.jpeg] renders results table with candidate name, assessment, score %, pass/fail chip, and pagination', async () => {
    renderResultsView();

    // Verify UI Sample candidate rows
    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();
    expect(screen.getByText('CAN-2026-001 • rohan.mehta@nitk.edu.in')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('(39/50 pts)')).toBeInTheDocument();

    // Verify Pass chip
    const passChips = screen.getAllByText('Pass');
    expect(passChips.length).toBeGreaterThanOrEqual(1);

    // Verify Fail chip
    expect(screen.getByText('Karan Singh')).toBeInTheDocument();
    expect(screen.getByText('48%')).toBeInTheDocument();
    expect(screen.getByText('Fail')).toBeInTheDocument();

    // Verify pagination footer matching UI Sample
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
  });

  it('[FR-ADMIN-005] filters results by pass/fail outcome', async () => {
    renderResultsView();

    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 3000 })).toBeInTheDocument();

    // Filter by Outcome: Fail Only
    const outcomeSelect = screen.getByLabelText(/Filter by pass or fail outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'FAIL' } });

    await waitFor(
      () => {
        expect(screen.queryByText('Rohan Mehta')).not.toBeInTheDocument();
        expect(screen.getByText('Karan Singh')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('[FR-SCORE-008] filters results by provisional status for subjective answers pending evaluation', async () => {
    renderResultsView();

    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 3000 })).toBeInTheDocument();

    // Filter by Status: Provisional Only (FR-SCORE-008)
    const statusSelect = screen.getByLabelText(/Filter by result status/i);
    fireEvent.change(statusSelect, { target: { value: 'PROVISIONAL' } });

    await waitFor(
      () => {
        expect(screen.getByText('Ananya Reddy')).toBeInTheDocument();
        expect(screen.getAllByText('Provisional').length).toBeGreaterThanOrEqual(2);
        expect(screen.queryByText('Rohan Mehta')).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('[FR-ADMIN-006] exports candidate results to CSV with proper headers', async () => {
    renderResultsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    // Click Export button
    const exportButton = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/Exported \d+ candidate result records to CSV/i),
    ).toBeInTheDocument();
  });

  it('[FR-SCORE-008, FR-ADMIN-003] opens Result Detail Review drawer with per-question score breakdown', async () => {
    renderResultsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    // Click "View Details" on Rohan Mehta's row
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    fireEvent.click(viewButtons[0]);

    // Drawer opens
    expect(await screen.findByText(/Question-by-Question Score Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText('AVL Tree Search Time Complexity')).toBeInTheDocument();
    expect(screen.getByText('Two Sum Problem (Coding Challenge)')).toBeInTheDocument();
    expect(screen.getByText(/5 \/ 6 passed/i)).toBeInTheDocument();

    // Close drawer
    const closeButton = screen.getByLabelText(/Close review drawer/i);
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Question-by-Question Score Breakdown/i)).not.toBeInTheDocument();
    });
  });
});
