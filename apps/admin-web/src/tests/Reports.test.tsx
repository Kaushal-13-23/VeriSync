/**
 * Vitest Reports & Analytics Suite
 * Traceability: FR-ADMIN-005, FR-ADMIN-006, FR-ADMIN-007, FR-SCORE-009, Rule 9
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../store/authContext';
import { ReportsView } from '../components/reports/ReportsView';

const renderReportsView = () => {
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
        <ReportsView />
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('Assessment Reports & Analytics (FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-009)', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('[FR-ADMIN-005] renders assessment summary cards (completed, avg score, pass rate, highest, lowest)', async () => {
    renderReportsView();

    // Summary KPI cards
    expect(await screen.findByText('Cohort Average', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('Highest Score')).toBeInTheDocument();
    expect(screen.getByText('Lowest Score')).toBeInTheDocument();
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
  });

  it('[FR-SCORE-009] renders candidate rankings table with deterministic tie-breaking criteria', async () => {
    renderReportsView();

    // Leaderboard table rendered
    expect(
      await screen.findByText(/Deterministic Leaderboard & Rankings/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    // Ranks rendered (#1 highest score, Divya Iyer with 92%)
    expect(screen.getByText('Divya Iyer')).toBeInTheDocument();
    expect(screen.getAllByText('92%').length).toBeGreaterThanOrEqual(1);

    // Check tie-break criteria subtext
    expect(
      screen.getByText(/Tie-breaks evaluated: 1. Score % → 2. Completion Time → 3. Candidate ID/i),
    ).toBeInTheDocument();
  });

  it('[FR-ADMIN-006, FR-ADMIN-007] renders question performance analytics and MCQ response distribution', async () => {
    renderReportsView();

    // Switch to Question Analytics tab
    const questionsTab = await screen.findByRole(
      'button',
      { name: /Question Analytics & Accuracy/i },
      { timeout: 3000 },
    );
    fireEvent.click(questionsTab);

    // Questions rendered with accuracy and difficulty
    expect(
      await screen.findByText('AVL Tree Search Time Complexity', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Discrimination Index:').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Correct-Answer Rate').length).toBeGreaterThanOrEqual(1);

    // Option response distribution for MCQ (FR-ADMIN-006)
    expect(screen.getAllByText('Option Response Distribution').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('O(log N)')).toBeInTheDocument();
  });
});
