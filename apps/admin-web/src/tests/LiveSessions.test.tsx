/**
 * Vitest Live Candidate Sessions & Monitoring Suite
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-TIME-001, Rule 1, Rule 9
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveSessionsView } from '../components/sessions/LiveSessionsView';

const renderLiveSessionsView = () => {
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
    </QueryClientProvider>,
  );
};

describe('Live Sessions Monitoring View', () => {
  it('[FR-ADMIN-001, FR-ADMIN-002] renders live sessions table with telemetry and status chips', async () => {
    renderLiveSessionsView();

    // Table header and telemetry row for Rohan Mehta (ACTIVE)
    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();
    expect(screen.getByText('CAN-2026-001')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-sess-1')).toHaveTextContent('Active');
    expect(screen.getAllByText('Q2 of 4').length).toBeGreaterThanOrEqual(1);

    // Interrupted session for Aisha Khan
    expect(screen.getByText('Aisha Khan')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-sess-2')).toHaveTextContent('Interrupted');

    // Submitted session for Priya Sharma
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-sess-3')).toHaveTextContent('Submitted');
  });

  it('[FR-ADMIN-001] filters candidate sessions by status pill', async () => {
    renderLiveSessionsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    // Click "Interrupted" filter pill
    const interruptedBtn = screen.getByTestId('filter-stat-interrupted');
    fireEvent.click(interruptedBtn);

    await waitFor(() => {
      expect(screen.getByText('Aisha Khan')).toBeInTheDocument();
      expect(screen.queryByText('Rohan Mehta')).not.toBeInTheDocument();
      expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
    });
  });

  it('[FR-ADMIN-001] filters candidate sessions by keyword search', async () => {
    renderLiveSessionsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    const searchInput = screen.getByTestId('live-session-search-input');
    fireEvent.change(searchInput, { target: { value: 'CAN-2026-006' } });

    await waitFor(() => {
      expect(screen.getByText('Suresh Nair')).toBeInTheDocument();
      expect(screen.queryByText('Rohan Mehta')).not.toBeInTheDocument();
    });

    // Clear search
    const clearBtn = screen.getByTestId('clear-search-btn');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    });
  });

  it('[FR-TIME-001] displays remaining authoritative countdown time', async () => {
    renderLiveSessionsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();
    // 2280s = 38m 00s
    expect(screen.getByTestId('remaining-time-sess-1')).toHaveTextContent('38m 00s');

    // Submitted session displays 0m 00s
    expect(screen.getByTestId('remaining-time-sess-3')).toHaveTextContent('0m 00s');
  });

  it('[FR-ADMIN-002] supports auto-refresh interval configuration and manual refresh', async () => {
    renderLiveSessionsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    const select = screen.getByTestId('auto-refresh-select') as HTMLSelectElement;
    expect(select.value).toBe('10000'); // default 10s

    fireEvent.change(select, { target: { value: '30000' } });
    expect(select.value).toBe('30000');

    const refreshBtn = screen.getByTestId('btn-manual-refresh');
    fireEvent.click(refreshBtn);
  });

  it('[FR-ADMIN-001] opens session detail modal displaying telemetry and client IP', async () => {
    renderLiveSessionsView();

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument();

    const detailBtn = screen.getByTestId('btn-details-sess-1');
    fireEvent.click(detailBtn);

    expect(await screen.findByTestId('session-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.105')).toBeInTheDocument();
    expect(screen.getByText('Server Authoritative (UTC)')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-session-detail-btn');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('session-detail-modal')).not.toBeInTheDocument();
    });
  });
});
