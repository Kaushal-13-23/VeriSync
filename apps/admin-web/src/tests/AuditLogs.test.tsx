/**
 * Vitest Audit Logs & Incident Oversight Suite
 * Traceability: FR-ADMIN-007, FR-ADMIN-008, SRS 11.4, Rule 7, Rule 9
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditLogsView } from '../components/audit/AuditLogsView';
import { ToastContainer } from '../components/ui/ToastContainer';

const renderAuditLogsView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogsView />
      <ToastContainer />
    </QueryClientProvider>,
  );
};

describe('Audit Logs & Incident Oversight (FR-ADMIN-007, FR-ADMIN-008)', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('[FR-ADMIN-007, Rule 7] renders audit logs with event type, actor, outcome, and justification reason', async () => {
    renderAuditLogsView();

    // Table rows
    expect(await screen.findByText('SESSION_OVERRIDE')).toBeInTheDocument();
    expect(screen.getAllByText('Dr. Ashlin Siddharth').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SUPER_ADMIN • usr-admin-01').length).toBeGreaterThanOrEqual(1);

    // Justification reason displayed
    expect(
      screen.getByText(/Lab 3 power interruption; timer held administratively/i),
    ).toBeInTheDocument();

    // Correlation ID
    expect(screen.getByText('cid-init-ovr-01')).toBeInTheDocument();
  });

  it('[FR-ADMIN-007] filters audit records by event type and actor', async () => {
    renderAuditLogsView();

    expect(await screen.findByText('SESSION_OVERRIDE')).toBeInTheDocument();

    // Filter by Event Type: ASSESSMENT_PUBLISH
    const eventTypeSelect = screen.getByTestId('audit-filter-event-type');
    fireEvent.change(eventTypeSelect, { target: { value: 'ASSESSMENT_PUBLISH' } });

    await waitFor(() => {
      expect(screen.getByText('ASSESSMENT_PUBLISH')).toBeInTheDocument();
      expect(screen.queryByText('SESSION_OVERRIDE')).not.toBeInTheDocument();
    });

    // Reset filters
    const resetBtn = screen.getByTestId('btn-reset-audit-filters');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText('SESSION_OVERRIDE')).toBeInTheDocument();
    });
  });

  it('[FR-ADMIN-007] looks up audit log by correlation ID', async () => {
    renderAuditLogsView();

    expect(await screen.findByText('SESSION_OVERRIDE')).toBeInTheDocument();

    const correlationInput = screen.getByTestId('audit-correlation-search');
    fireEvent.change(correlationInput, { target: { value: 'cid-sec-alert-dup-01' } });

    await waitFor(() => {
      expect(screen.getByText('SECURITY_ALERT')).toBeInTheDocument();
      expect(screen.queryByText('SESSION_OVERRIDE')).not.toBeInTheDocument();
    });
  });

  it('[FR-ADMIN-008, SRS 11.4] switches to Incident Reports view and displays disruption severity & supervisor notes', async () => {
    renderAuditLogsView();

    expect(await screen.findByText('SESSION_OVERRIDE')).toBeInTheDocument();

    // Click Incident sub-tab
    const incidentTab = screen.getByTestId('subtab-incident-logs');
    fireEvent.click(incidentTab);

    // Incident card rendered
    expect(await screen.findByText('Admin Override: PAUSE (Suresh Nair)')).toBeInTheDocument();
    expect(
      screen.getByText('Lab 3 power interruption; timer held administratively.'),
    ).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(
      screen.getByText(/Waiting for lab electrical engineer confirmation/i),
    ).toBeInTheDocument();

    // High severity incident for Aisha Khan
    expect(
      screen.getByText('Session Interruption: Missed Heartbeats (Aisha Khan)'),
    ).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('[FR-ADMIN-007] exports filtered audit logs as CSV', async () => {
    renderAuditLogsView();

    expect(await screen.findByText('SESSION_OVERRIDE')).toBeInTheDocument();

    // Mock link click / download
    const exportBtn = screen.getByTestId('btn-export-audit-csv');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText('Export Complete')).toBeInTheDocument();
    });
  });
});
