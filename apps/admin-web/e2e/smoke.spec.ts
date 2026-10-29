/**
 * Playwright E2E Smoke Test for VeriSync Admin Portal
 * Traceability: FR-AUTH-001, FR-AUTH-008, FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-003, FR-ASMT-006, NFR-USE-001
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Web Portal Smoke Test', () => {
  test('[FR-AUTH-001, FR-AUTH-008, FR-ADMIN-001] complete login with TOTP MFA and explore dashboard overview', async ({
    page,
  }) => {
    // 1. Visit root page
    await page.goto('/');

    // Verify brand tagline panel and login form
    await expect(page.getByText('VeriSync', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Trusted Assessments for a Brighter Tomorrow')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Administrator Login' })).toBeVisible();

    // 2. Submit credentials
    await page.getByLabel(/Email address or Username/i).fill('admin@verisync.internal');
    await page.getByLabel(/^Password$/i).fill('Password123!');
    await page.getByRole('button', { name: /^Login$/i }).click();

    // 3. MFA TOTP Step
    await expect(page.getByText('Two-Factor Authentication')).toBeVisible();
    await expect(page.getByLabel(/6-Digit Security Code/i)).toBeVisible();

    await page.getByLabel(/6-Digit Security Code/i).fill('123456');
    await page.getByRole('button', { name: /Verify Code/i }).click();

    // 4. Verify landing on Admin Dashboard Shell
    await expect(page.getByText('Administrator Portal')).toBeVisible();
    await expect(page.getByText('Platform Overview')).toBeVisible();

    // 5. Verify 4 Stat Cards (FR-ADMIN-001)
    await expect(page.getByText('Total Candidates')).toBeVisible();
    await expect(page.getByText('1,248')).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: /^Assessments$/i })).toBeVisible();
    await expect(page.getByText('Completed Tests')).toBeVisible();
    await expect(page.getByText('Active Candidates')).toBeVisible();

    // 6. Verify Donut Chart & Upcoming Assessments (FR-ADMIN-003, FR-ASMT-006)
    await expect(page.getByText('Test Completion Rate')).toBeVisible();
    await expect(page.getByText('72%')).toBeVisible();
    await expect(page.getByText('Upcoming Assessments')).toBeVisible();
    await expect(page.getByText('Frontend Developer Test').first()).toBeVisible();

    // 7. Verify Sidebar Navigation to Candidates Tab (FR-CAN-001)
    await page.getByRole('button', { name: /Candidates/i }).click();
    await expect(page.getByText('Candidates Roster')).toBeVisible();
    await expect(page.getByText('CAN-2026-001').first()).toBeVisible();
    await expect(page.getByText('Rohan Mehta').first()).toBeVisible();

    // 8. Verify Sidebar Navigation to Question Bank Tab (FR-QB-001)
    await page.getByRole('button', { name: /Question Bank/i }).click();
    await expect(page.getByText('Question Bank Repository')).toBeVisible();
    await expect(page.getByText('q-101').first()).toBeVisible();

    // 9. Verify Sidebar Navigation to Assessments Tab (FR-ASMT-001)
    await page.getByRole('button', { name: /Assessments/i }).click();
    await expect(page.getByText('Assessments Catalog')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Assessment/i })).toBeVisible();

    // 10. Verify Sidebar Navigation to Live Sessions (FR-ADMIN-001, FR-ADMIN-002)
    await page.getByRole('button', { name: /Live Sessions/i }).click();
    await expect(page.getByText('Live Session Monitoring')).toBeVisible();
    await expect(page.getByText('Rohan Mehta').first()).toBeVisible();
    await expect(page.getByText('38m 00s')).toBeVisible();

    // 11. Administrative Override with Mandatory Reason (BR-012, FR-ADMIN-004)
    await page.getByTestId('btn-override-sess-1').click();
    await expect(page.getByTestId('session-override-modal')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Administrative Override' })).toBeVisible();

    // Fill extension, mandatory reason, and confirmation
    await page.getByTestId('input-extension-minutes').fill('25');
    await page.getByTestId('input-override-reason').fill('Lab 3 switch reboot; 25min approved.');
    await page.getByTestId('override-confirm-checkbox').check();
    await page.getByTestId('btn-submit-override').click();

    // Toast notification with correlation ID appears
    await expect(page.getByText('Override Applied')).toBeVisible();

    // 12. Audit Logs & Incident Oversight (FR-ADMIN-007, FR-ADMIN-008)
    await page.getByRole('button', { name: /Audit Logs/i }).click();
    await expect(page.getByText('Audit Trail & Incident Oversight')).toBeVisible();
    await expect(page.getByTestId('audit-log-table')).toContainText('SESSION_OVERRIDE');
    await expect(page.getByTestId('audit-log-table')).toContainText('Dr. Ashlin Siddharth');

    // Switch to incidents tab
    await page.getByTestId('subtab-incident-logs').click();
    await expect(page.getByText('SRS 11.4 Incident Telemetry Notice')).toBeVisible();
    await expect(page.getByText('Admin Override: PAUSE (Suresh Nair)').first()).toBeVisible();

    // 13. Results & Manual Evaluation (FR-ADMIN-005, FR-SCORE-008, UI_Sample.jpeg)
    await page.getByRole('button', { name: /Results/i }).click();
    await expect(page.getByText('Results & Scoring')).toBeVisible();
    await expect(page.getByText('Rohan Mehta').first()).toBeVisible();
    await expect(page.getByText('78%').first()).toBeVisible();

    // 14. Results CSV Export Flow (FR-ADMIN-006)
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('VeriSync_Results_Export_');

    // 15. Score Correction Flow with Mandatory Reason (BR-012, Rule 7, UC-15)
    const correctButtons = page.getByRole('button', { name: /^Correct$/i });
    await correctButtons.first().click();
    await expect(page.getByRole('heading', { name: 'Score Correction Workflow' })).toBeVisible();

    // Verify empty reason validation
    await page.getByRole('button', { name: /Confirm Score Correction/i }).click();
    await expect(page.getByTestId('correction-error-banner')).toBeVisible();
    await expect(
      page.getByText(/Mandatory justification reason is required for administrative score correction/i),
    ).toBeVisible();

    // Fill valid reason and confirm
    await page
      .getByLabel(/Mandatory Justification Reason/i)
      .fill('E2E smoke test: adjusted marks per rubric review.');
    await page.getByLabel(/Confirm score modification audit stamp/i).check();
    await page.getByRole('button', { name: /Confirm Score Correction/i }).click();
    await expect(page.getByText(/Score Corrected Successfully/i)).toBeVisible();

    // 16. Reports Page & Analytics (FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-009)
    await page.getByRole('button', { name: /Reports/i }).click();
    await expect(page.getByText('Assessment Reports & Analytics').first()).toBeVisible();
    await expect(page.getByText('Cohort Average')).toBeVisible();
    await expect(page.getByText('Deterministic Leaderboard & Rankings')).toBeVisible();

    // Switch to question analytics
    await page.getByRole('button', { name: /Question Analytics & Accuracy/i }).click();
    await expect(page.getByText('AVL Tree Search Time Complexity').first()).toBeVisible();
    await expect(page.getByText('Option Response Distribution').first()).toBeVisible();
  });
});


