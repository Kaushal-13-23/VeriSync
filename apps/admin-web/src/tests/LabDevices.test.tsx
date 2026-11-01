/**
 * Vitest Lab Devices Management Suite (UC-17, FR-LAB-001..004, Rule 7, BR-012)
 * Traceability: UC-17, FR-LAB-001, FR-LAB-002, FR-LAB-003, FR-LAB-004
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LabDevicesView } from '../components/devices/LabDevicesView';

afterEach(() => {
  cleanup();
});

const renderLabDevicesView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LabDevicesView />
    </QueryClientProvider>,
  );
};

describe('Lab Devices Management View (UC-17, FR-LAB-001..004)', () => {
  it('[FR-LAB-001, UC-17] renders device stats overview and workstations roster', async () => {
    renderLabDevicesView();

    // Stat cards
    expect(await screen.findByText('Total Registered')).toBeInTheDocument();
    expect(screen.getAllByText('Active Authorized').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Suspended').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Blocked').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Outdated Version')).toBeInTheDocument();

    // Devices rendered
    expect(await screen.findByText('LAB-PC-101')).toBeInTheDocument();
    expect(screen.getByText('LAB-PC-102')).toBeInTheDocument();
    expect(screen.getByText('LAB-PC-103')).toBeInTheDocument();
    expect(screen.getByText('LAB-PC-104')).toBeInTheDocument();
    expect(screen.getByText('LAB-PC-105')).toBeInTheDocument();

    // Verify status badges
    expect(screen.getByTestId('status-badge-dev-1')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('status-badge-dev-4')).toHaveTextContent('SUSPENDED');
    expect(screen.getByTestId('status-badge-dev-5')).toHaveTextContent('BLOCKED');
  });

  it('[FR-LAB-003] flags terminals running outdated client versions', async () => {
    renderLabDevicesView();

    expect(await screen.findByText('LAB-PC-103')).toBeInTheDocument();

    // LAB-PC-103 runs v1.0.9 while approved is v1.1.0
    const versionBadge = screen.getByTestId('version-badge-dev-3');
    expect(versionBadge).toHaveTextContent('v1.0.9');

    const warningBadge = screen.getByTestId('outdated-warning-dev-3');
    expect(warningBadge).toHaveTextContent('Outdated');
  });

  it('[FR-LAB-001] filters devices by status select', async () => {
    renderLabDevicesView();

    expect(await screen.findByText('LAB-PC-101')).toBeInTheDocument();

    // Select "BLOCKED" from status filter
    const statusSelect = screen.getByTestId('select-filter-status');
    fireEvent.change(statusSelect, { target: { value: 'BLOCKED' } });

    await waitFor(() => {
      expect(screen.getByText('LAB-PC-105')).toBeInTheDocument();
      expect(screen.queryByText('LAB-PC-101')).not.toBeInTheDocument();
      expect(screen.queryByText('LAB-PC-102')).not.toBeInTheDocument();
    });
  });

  it('[FR-LAB-001, FR-LAB-002, UC-17] opens registration modal and registers a new workstation', async () => {
    renderLabDevicesView();

    expect(await screen.findByText('LAB-PC-101')).toBeInTheDocument();

    // Click Register Device button
    const registerBtn = screen.getByTestId('btn-register-device');
    fireEvent.click(registerBtn);

    // Modal opens
    expect(await screen.findByText('Register Authorized Lab Device')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId('input-device-reference'), {
      target: { value: 'LAB-PC-199' },
    });
    fireEvent.change(screen.getByTestId('input-device-hostname'), {
      target: { value: 'lab4-ws-99.internal' },
    });
    fireEvent.change(screen.getByTestId('input-device-ip'), {
      target: { value: '192.168.10.199' },
    });
    fireEvent.change(screen.getByTestId('input-device-mac'), {
      target: { value: 'AA:BB:CC:DD:EE:FF' },
    });
    fireEvent.change(screen.getByTestId('input-device-location'), {
      target: { value: 'Lab 4 - Ground Floor' },
    });

    // Submit registration
    const submitBtn = screen.getByTestId('submit-register-device-btn');
    fireEvent.click(submitBtn);

    // Should appear in list
    expect(await screen.findByText('LAB-PC-199')).toBeInTheDocument();
  });

  it('[FR-LAB-004, BR-012, Rule 7] updates device status requiring mandatory justification reason', async () => {
    renderLabDevicesView();

    expect(await screen.findByText('LAB-PC-102')).toBeInTheDocument();

    // Click Change Status button for LAB-PC-102
    const changeStatusBtn = screen.getByTestId('btn-status-dev-2');
    fireEvent.click(changeStatusBtn);

    // Status modal opens
    expect(await screen.findByText(/Update Device Status: LAB-PC-102/i)).toBeInTheDocument();

    // Select SUSPENDED
    const statusSelect = screen.getByTestId('select-device-status');
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    // Reason input validation check
    const reasonInput = screen.getByTestId('input-status-reason');
    fireEvent.change(reasonInput, { target: { value: 'Scheduled cleaning and memory upgrade.' } });

    // Confirm status change
    const confirmBtn = screen.getByTestId('submit-status-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByTestId('status-badge-dev-2')).toHaveTextContent('SUSPENDED');
    });
  });

  it('[FR-LAB-003, Rule 7] updates device approved client version with audit justification', async () => {
    renderLabDevicesView();

    expect(await screen.findByText('LAB-PC-103')).toBeInTheDocument();

    // Click Update Version button for LAB-PC-103
    const updateVerBtn = screen.getByTestId('btn-version-dev-3');
    fireEvent.click(updateVerBtn);

    // Version modal opens
    expect(await screen.findByText(/Update Client Version: LAB-PC-103/i)).toBeInTheDocument();

    // Input new version
    const versionInput = screen.getByTestId('input-approved-version');
    fireEvent.change(versionInput, { target: { value: '1.1.0' } });

    // Input justification reason
    const reasonInput = screen.getByTestId('input-version-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Upgraded client binary via Ansible automation.' },
    });

    // Confirm version update
    const confirmBtn = screen.getByTestId('submit-version-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const updatedChip = screen.getByTestId('version-badge-dev-3');
      expect(updatedChip).toHaveTextContent('v1.1.0');
      expect(screen.queryByTestId('outdated-warning-dev-3')).not.toBeInTheDocument();
    });
  });
});
