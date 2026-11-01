/**
 * Vitest Security Settings Suite (FR-AUTH-007, FR-AUTH-008, NFR-SEC-004, SRS 10)
 * Traceability: FR-AUTH-007, FR-AUTH-008, FR-CONF-001, NFR-SEC-004, Rule 5, Rule 7
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../store/authContext';
import { SecuritySettingsView } from '../components/settings/SecuritySettingsView';

afterEach(() => {
  cleanup();
});

const renderSecuritySettingsView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SecuritySettingsView />
      </QueryClientProvider>
    </AuthProvider>,
  );
};

describe('Security Settings & Hardening Suite (FR-AUTH-007, FR-AUTH-008, NFR-SEC-004)', () => {
  it('[FR-AUTH-007, NFR-SEC-004] loads and renders system security policies', async () => {
    renderSecuritySettingsView();

    // Verify main sections
    expect(
      await screen.findByText(/Privileged Administrator Access & Multi-Factor Authentication/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Administrator Session Inactivity & Auto-Revocation Policy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Candidate Desktop Client Compatibility & Kiosk Policy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tamper-Evident Audit Trail Cryptographic Verification/i),
    ).toBeInTheDocument();

    // Verify default populated form values
    const timeoutSelect = screen.getByTestId('select-session-timeout') as HTMLSelectElement;
    expect(timeoutSelect.value).toBe('15');

    const warningSelect = screen.getByTestId('select-warning-countdown') as HTMLSelectElement;
    expect(warningSelect.value).toBe('60');

    const approvedVerInput = screen.getByTestId(
      'input-approved-version-policy',
    ) as HTMLInputElement;
    expect(approvedVerInput.value).toBe('1.1.0');
  });

  it('[Rule 7, FR-CONF-003] saves updated security policies requiring mandatory justification reason', async () => {
    renderSecuritySettingsView();

    expect(
      await screen.findByText(/Administrator Session Inactivity & Auto-Revocation Policy/i),
    ).toBeInTheDocument();

    // Change timeout from 15 to 30
    const timeoutSelect = screen.getByTestId('select-session-timeout');
    fireEvent.change(timeoutSelect, { target: { value: '30' } });

    // Try saving without reason
    const saveBtn = screen.getByTestId('btn-save-policies');
    fireEvent.click(saveBtn);

    // Reason validation prompt appears
    expect(
      await screen.findByText(
        /Mandatory justification reason \(minimum 5 characters\) is required/i,
      ),
    ).toBeInTheDocument();

    // Provide reason
    const reasonInput = screen.getByTestId('input-policy-reason');
    fireEvent.change(reasonInput, {
      target: { value: 'Extended timeout for proctored lab session per campus exam guidelines.' },
    });

    // Save again
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('policy-reason-error')).not.toBeInTheDocument();
    });
  });

  it('[SRS 10.5, SRS 11.4] triggers cryptographic SHA-256 audit hash chain verification', async () => {
    renderSecuritySettingsView();

    expect(
      await screen.findByText(/Tamper-Evident Audit Trail Cryptographic Verification/i),
    ).toBeInTheDocument();

    // Click verify hash chain button
    const verifyBtn = screen.getByTestId('btn-verify-audit-chain');
    fireEvent.click(verifyBtn);

    // Verification result card appears
    expect(await screen.findByTestId('audit-verification-banner')).toBeInTheDocument();
    expect(screen.getByText('100% VALID')).toBeInTheDocument();
    expect(screen.getByText(/Audit Cryptographic Chain Verified \(SHA-256\)/i)).toBeInTheDocument();
  });

  it('[FR-AUTH-008] launches MFA setup modal flow', async () => {
    renderSecuritySettingsView();

    expect(
      await screen.findByText(/Privileged Administrator Access & Multi-Factor Authentication/i),
    ).toBeInTheDocument();

    // Click Set Up / Re-enroll MFA button
    const setupMfaBtn = screen.getByTestId('btn-reconfigure-mfa');
    fireEvent.click(setupMfaBtn);

    // Modal opens at Step 1: Scan QR Code
    expect(await screen.findByTestId('mfa-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-secret-key')).toHaveTextContent('JBSWY3DPEHPK3PXP');

    // Advance to Step 2: Emergency Backup Codes
    const nextBtn = screen.getByTestId('btn-step-1-next');
    fireEvent.click(nextBtn);

    expect(await screen.findByTestId('mfa-step-2')).toBeInTheDocument();
    expect(screen.getByText('A8F4-9C12')).toBeInTheDocument();

    // Check confirmation checkbox
    const confirmCheckbox = screen.getByTestId('confirm-backup-saved-checkbox');
    fireEvent.click(confirmCheckbox);

    // Advance to Step 3: Verify TOTP Code
    const verifyStepBtn = screen.getByTestId('btn-step-2-next');
    fireEvent.click(verifyStepBtn);

    expect(await screen.findByTestId('mfa-step-3')).toBeInTheDocument();

    // Enter valid 6-digit code
    const codeInput = screen.getByTestId('input-totp-verify');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    // Submit verification
    const activateBtn = screen.getByTestId('btn-verify-mfa-submit');
    fireEvent.click(activateBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByTestId('mfa-setup-modal')).not.toBeInTheDocument();
    });
  });
});
