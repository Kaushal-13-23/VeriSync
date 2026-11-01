/**
 * Playwright E2E Test Suite for Lab Devices & Security Hardening
 * Traceability: UC-17, FR-LAB-001..004, FR-AUTH-007, FR-AUTH-008, NFR-SEC-004, SRS 10.3, SRS 10.5, Rule 7
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Lab Devices & Security Policies Suite (Phase 6)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Super Admin with MFA
    await page.goto('/');

    await page.getByLabel(/Email address or Username/i).fill('admin@verisync.internal');
    await page.getByLabel(/^Password$/i).fill('Password123!');
    await page.getByRole('button', { name: /^Login$/i }).click();

    // TOTP challenge
    await expect(page.getByText('Two-Factor Authentication')).toBeVisible();
    await page.getByLabel(/6-Digit Security Code/i).fill('123456');
    await page.getByRole('button', { name: /Verify Code/i }).click();

    await expect(page.getByText('Administrator Portal')).toBeVisible();
  });

  test('[UC-17, FR-LAB-001..004] manages lab workstations registry, registration, and status overrides', async ({
    page,
  }) => {
    // 1. Navigate to Lab Devices tab
    await page.getByRole('button', { name: /Lab Devices/i }).click();
    await expect(page.getByText('Authorized Lab Devices Registry')).toBeVisible();

    // 2. Verify Stat Cards
    await expect(page.getByText('Total Registered')).toBeVisible();
    await expect(page.getByText('Active Authorized').first()).toBeVisible();
    await expect(page.getByText('Outdated Version')).toBeVisible();

    // 3. Verify workstation roster
    await expect(page.getByText('LAB-PC-101')).toBeVisible();
    await expect(page.getByText('LAB-PC-103')).toBeVisible();

    // 4. Verify outdated version warning chip for LAB-PC-103 (runs v1.0.9 vs v1.1.0)
    await expect(page.getByTestId('outdated-warning-dev-3')).toBeVisible();
    await expect(page.getByTestId('version-badge-dev-3')).toHaveText('v1.0.9');

    // 5. Open Register Lab Device modal
    await page.getByTestId('btn-register-device').click();
    await expect(page.getByText('Register Authorized Lab Device')).toBeVisible();

    // 6. Fill registration form
    await page.getByTestId('input-device-reference').fill('LAB-PC-201');
    await page.getByTestId('input-device-hostname').fill('lab2-ws-201.internal');
    await page.getByTestId('input-device-ip').fill('192.168.10.201');
    await page.getByTestId('input-device-mac').fill('11:22:33:44:55:66');
    await page.getByTestId('input-device-location').fill('Lab 2 - North Wing');

    await page.getByTestId('submit-register-device-btn').click();

    // 7. Verify newly registered device in table
    await expect(page.getByText('LAB-PC-201')).toBeVisible();

    // 8. Test Status Update with Mandatory Justification (Rule 7, BR-012)
    await page.getByTestId('btn-status-dev-1').click();
    await expect(page.getByText(/Update Device Status: LAB-PC-101/i)).toBeVisible();

    // Attempt submitting without justification reason
    await page.getByTestId('select-device-status').selectOption('SUSPENDED');
    await page.getByTestId('submit-status-btn').click();

    await expect(
      page.getByText(/Mandatory justification reason \(minimum 5 characters\) is required/i),
    ).toBeVisible();

    // Provide mandatory reason and confirm
    await page
      .getByTestId('input-status-reason')
      .fill('Routine power unit diagnostic inspection.');
    await page.getByTestId('submit-status-btn').click();

    // Status badge updates
    await expect(page.getByTestId('status-badge-dev-1')).toHaveText('SUSPENDED');
  });

  test('[FR-AUTH-008, NFR-SEC-004] explores security settings, MFA setup flow, and cryptographic audit hash chain', async ({
    page,
  }) => {
    // 1. Navigate to Settings / Security Settings tab
    await page.getByRole('button', { name: /^Settings$/i }).click();
    await expect(page.getByText('Security Hardening & Platform Policies')).toBeVisible();

    // 2. Verify Session Timeout & Policies
    await expect(
      page.getByText('Administrator Session Inactivity & Auto-Revocation Policy'),
    ).toBeVisible();
    await expect(page.getByTestId('select-session-timeout')).toHaveValue('15');
    await expect(page.getByTestId('select-warning-countdown')).toHaveValue('60');

    // 3. Test Cryptographic SHA-256 Audit Chain Verification
    await page.getByTestId('btn-verify-audit-chain').click();
    await expect(page.getByTestId('audit-verification-banner')).toBeVisible();
    await expect(page.getByText('100% VALID')).toBeVisible();
    await expect(page.getByText(/Audit Cryptographic Chain Verified \(SHA-256\)/i)).toBeVisible();

    // 4. Launch MFA Setup Wizard
    await page.getByTestId('btn-reconfigure-mfa').click();
    await expect(page.getByTestId('mfa-step-1')).toBeVisible();
    await expect(page.getByTestId('mfa-secret-key')).toBeVisible();

    // Advance to Step 2: Emergency Backup Codes
    await page.getByTestId('btn-step-1-next').click();
    await expect(page.getByTestId('mfa-step-2')).toBeVisible();
    await expect(page.getByTestId('backup-code-0')).toBeVisible();

    // Acknowledge backup codes checkbox
    await page.getByTestId('confirm-backup-saved-checkbox').check();
    await page.getByTestId('btn-step-2-next').click();

    // Step 3: Verify 6-digit TOTP
    await expect(page.getByTestId('mfa-step-3')).toBeVisible();
    await page.getByTestId('input-totp-verify').fill('123456');
    await page.getByTestId('btn-verify-mfa-submit').click();

    // Modal closes upon successful activation
    await expect(page.getByTestId('mfa-setup-modal')).not.toBeVisible();
  });

  test('[FR-LAB-006, SRS 10.3] reviews live session integrity events with non-conclusive evidentiary advisory', async ({
    page,
  }) => {
    // 1. Navigate to Live Sessions tab
    await page.getByRole('button', { name: /Live Sessions/i }).click();
    await expect(page.getByText('Live Session Monitoring')).toBeVisible();

    // 2. Switch to Integrity Events telemetry stream sub-tab
    await page.getByTestId('tab-integrity-events').click();
    await expect(page.getByTestId('integrity-events-panel')).toBeVisible();

    // 3. Check Non-Negotiable Evidentiary Notice (SRS 10.3 / Line 762)
    await expect(page.getByTestId('integrity-conclusiveness-notice')).toBeVisible();
    await expect(
      page.getByText(/A single integrity event is not conclusive proof of cheating/i),
    ).toBeVisible();

    // 4. Verify Lockdown security incident telemetry stream
    const eventsTable = page.getByTestId('integrity-events-table');
    await expect(eventsTable).toBeVisible();
    await expect(eventsTable.getByText('Rohan Mehta').first()).toBeVisible();
    await expect(eventsTable.getByText('PROHIBITED PROCESS')).toBeVisible();
    await expect(eventsTable.getByText('EXIT ATTEMPT')).toBeVisible();
  });
});
