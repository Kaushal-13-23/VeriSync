/**
 * Vitest Evaluator Role & Permissions Suite
 * Verifies role-based access control (RBAC):
 * - TECHNICAL_EVALUATOR: Can access Results, review answers, and grade Manual Evaluation Queue (UC-14).
 * - TECHNICAL_EVALUATOR: Denied access to administrative Score Correction action button (UC-15, FR-ADMIN-009).
 * - SUPER_ADMIN: Full access including score correction overrides.
 * Traceability: FR-ADMIN-009, UC-14, UC-15, Rule 7, Rule 9
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../store/authContext';
import { ResultsView } from '../components/results/ResultsView';

const renderResultsWithRole = (role: 'SUPER_ADMIN' | 'TECHNICAL_EVALUATOR') => {
  localStorage.setItem('verisync_admin_remember', 'true');
  localStorage.setItem('verisync_admin_access_token', `mock_${role.toLowerCase()}_token`);
  localStorage.setItem(
    'verisync_admin_user',
    JSON.stringify({
      id: role === 'SUPER_ADMIN' ? 'usr-admin-01' : 'usr-eval-01',
      username: `${role.toLowerCase()}@verisync.com`,
      email: `${role.toLowerCase()}@verisync.com`,
      fullName: role === 'SUPER_ADMIN' ? 'Super Admin' : 'Technical Evaluator',
      role,
    }),
  );

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
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('Role-Based Permissions Enforcement (FR-ADMIN-009, UC-14, UC-15)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('[FR-ADMIN-009, UC-14] TECHNICAL_EVALUATOR can view results and access manual evaluation queue', async () => {
    renderResultsWithRole('TECHNICAL_EVALUATOR');

    // Evaluator can see candidate results table
    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();

    // Evaluator can switch to evaluation queue
    const queueTab = screen.getByRole('button', { name: /Evaluation Queue/i });
    fireEvent.click(queueTab);

    // Queue is accessible and actionable
    expect(await screen.findByText(/Subjective Evaluation Queue/i)).toBeInTheDocument();
    expect(await screen.findByText('Ananya Reddy', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Submit Evaluation/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('[FR-ADMIN-009, UC-15] TECHNICAL_EVALUATOR is restricted and cannot see or access "Correct" score action', async () => {
    renderResultsWithRole('TECHNICAL_EVALUATOR');

    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 3000 })).toBeInTheDocument();

    // "View Details" is available to Evaluator
    const viewButtons = screen.getAllByRole('button', { name: /View Details/i });
    expect(viewButtons.length).toBeGreaterThanOrEqual(1);

    // "Correct" button is NOT rendered for Evaluator
    expect(screen.queryByRole('button', { name: /^Correct$/i })).not.toBeInTheDocument();

    // Open detail drawer
    fireEvent.click(viewButtons[0]);
    expect(await screen.findByText(/Question-by-Question Score Breakdown/i)).toBeInTheDocument();

    // Inside drawer, "Correct Score (Audited)" is also hidden from Evaluator
    expect(
      screen.queryByRole('button', { name: /Correct Score \(Audited\)/i }),
    ).not.toBeInTheDocument();
  });

  it('[FR-ADMIN-009, UC-15] SUPER_ADMIN has full permissions to perform audited score corrections', async () => {
    renderResultsWithRole('SUPER_ADMIN');

    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 3000 })).toBeInTheDocument();

    // "Correct" button is rendered for Super Admin
    const correctButtons = screen.getAllByRole('button', { name: /^Correct$/i });
    expect(correctButtons.length).toBeGreaterThanOrEqual(1);

    // Clicking "Correct" opens the audited score correction modal
    fireEvent.click(correctButtons[0]);
    expect(await screen.findByText('Score Correction Workflow')).toBeInTheDocument();
  });
});
