/**
 * Vitest Integrity Events & Telemetry Panel Suite (FR-LAB-006, SRS 10.3)
 * Traceability: FR-LAB-006, SRS 10.3 (Line 762), SRS 10.5
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntegrityEventsPanel } from '../components/sessions/IntegrityEventsPanel';

afterEach(() => {
  cleanup();
});

const renderIntegrityEventsPanel = (sessionId?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IntegrityEventsPanel sessionId={sessionId} />
    </QueryClientProvider>,
  );
};

describe('Integrity Events & Telemetry Panel (FR-LAB-006, SRS 10.3)', () => {
  it('[SRS 10.3, Line 762] displays the mandatory non-conclusive evidentiary advisory banner', async () => {
    renderIntegrityEventsPanel();

    expect(await screen.findByText(/Important Proctoring Advisory/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A single integrity event is not conclusive proof of cheating/i),
    ).toBeInTheDocument();
  });

  it('[FR-LAB-006] renders lockdown security incident cards with candidate and severity badges', async () => {
    renderIntegrityEventsPanel();

    // Verify candidate telemetry in stream
    const rohanElements = await screen.findAllByText('Rohan Mehta');
    expect(rohanElements.length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('CAN-2026-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('FOCUS LOST')).toBeInTheDocument();
    expect(screen.getByText('PROHIBITED PROCESS DETECTED')).toBeInTheDocument();
    expect(screen.getByText('EXIT ATTEMPT')).toBeInTheDocument();
    expect(screen.getByText('CLIPBOARD ACCESSED')).toBeInTheDocument();

    // Check severity badges
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getAllByText('HIGH').length).toBeGreaterThanOrEqual(1);
  });

  it('[FR-LAB-006] filters events by severity level', async () => {
    renderIntegrityEventsPanel();

    const rohanElements = await screen.findAllByText('Rohan Mehta');
    expect(rohanElements.length).toBeGreaterThanOrEqual(1);

    // Select "CRITICAL" severity filter
    const severitySelect = screen.getByTestId('select-integrity-severity');
    fireEvent.change(severitySelect, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      // Only EXIT ATTEMPT is CRITICAL in mock data
      expect(screen.getByText('EXIT ATTEMPT')).toBeInTheDocument();
      expect(screen.queryByText('FOCUS LOST')).not.toBeInTheDocument();
      expect(screen.queryByText('SHORTCUT TRIPPED')).not.toBeInTheDocument();
    });
  });

  it('[FR-LAB-006] filters events scoped to a specific candidate session', async () => {
    renderIntegrityEventsPanel('sess-2');

    // Only events for sess-2 (Aisha Khan) should appear
    expect(await screen.findByText('SHORTCUT TRIPPED')).toBeInTheDocument();
    expect(screen.getByText('CLIPBOARD ACCESSED')).toBeInTheDocument();
    expect(screen.queryByText('EXIT ATTEMPT')).not.toBeInTheDocument();
  });
});
