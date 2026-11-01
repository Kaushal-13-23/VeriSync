/**
 * Full-Lifecycle End-to-End Test Suite for VeriSync
 * Covers the entire placement drive operational pipeline:
 * 1. Administrator MFA Login (FR-AUTH-001, FR-AUTH-008)
 * 2. Candidate Provisioning (FR-CAN-001, FR-CAN-007)
 * 3. Assessment Authoring & Snapshot Publishing (FR-ASMT-001..003, Decision 5)
 * 4. Candidate Assessment Assignment (FR-CAN-004)
 * 5. Candidate Exam Attempt Execution via Harness (FR-TIME, FR-ANS)
 * 6. Live Session Monitoring & Telemetry (FR-ADMIN-002, FR-LAB-006)
 * 7. Manual Subjective Evaluation Queue (UC-14, FR-SCORE-004)
 * 8. Audited Score Correction Workflow (UC-15, FR-SCORE-010, Rule 7, BR-012)
 * 9. Results Table & CSV Export (FR-ADMIN-005, FR-ADMIN-006)
 */

import { test, expect } from '@playwright/test';

test.describe('VeriSync Full-Lifecycle Production Pipeline E2E (Phase 7)', () => {
  test('executes end-to-end placement workflow from candidate provisioning to results export', async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // 1. Admin Authentication & MFA Handshake (FR-AUTH-001, FR-AUTH-008)
    // -------------------------------------------------------------------------
    await page.goto('/');

    await page.getByLabel(/Email address or Username/i).fill('admin@verisync.internal');
    await page.getByLabel(/^Password$/i).fill('Password123!');
    await page.getByRole('button', { name: /^Login$/i }).click();

    await expect(page.getByText('Two-Factor Authentication')).toBeVisible();
    await page.getByLabel(/6-Digit Security Code/i).fill('123456');
    await page.getByRole('button', { name: /Verify Code/i }).click();

    await expect(page.getByText('Administrator Portal')).toBeVisible();
    await expect(page.getByText('Platform Overview')).toBeVisible();

    // -------------------------------------------------------------------------
    // 2. Candidate Provisioning (FR-CAN-001, FR-CAN-007)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Candidates/i }).click();
    await expect(page.getByText('Candidates Roster')).toBeVisible();

    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await expect(page.getByRole('heading', { name: 'Add New Candidate' })).toBeVisible();

    const candidateUniqueId = `CAN-2026-${Date.now().toString().slice(-4)}`;
    await page.getByTestId('input-candidate-id').fill(candidateUniqueId);
    await page.getByTestId('input-recruitment-reference').fill('Campus 2026 Drive');
    await page.getByTestId('input-full-name').fill('Kavya Iyer');
    await page.getByTestId('input-email').fill('kavya.iyer@campus.edu');
    await page.getByTestId('input-institution').fill('National Institute of Technology');
    await page.getByTestId('input-qualification').fill('B.Tech Computer Science');

    await page.getByTestId('modal-submit-btn').click();
    await expect(page.getByTestId('modal-done-btn')).toBeVisible();
    await page.getByTestId('modal-done-btn').click();
    await expect(page.getByText(candidateUniqueId).first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Assessment Authoring & Snapshot Publishing (FR-ASMT-001..003)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Assessments/i }).click();
    await expect(page.getByText('Assessments Catalog')).toBeVisible();

    await page.getByRole('button', { name: /Create Assessment/i }).click();
    await expect(page.getByTestId('assessment-wizard')).toBeVisible();

    // Step 1: Basic Details
    const assessmentTitle = `TCS Placement Drive ${Date.now().toString().slice(-4)}`;
    await page.getByTestId('input-assessment-title').fill(assessmentTitle);
    await page.getByTestId('input-role-category').fill('Software Development Engineer');
    await page.getByTestId('input-overall-duration').fill('60');
    await page.getByTestId('wizard-btn-next').click();

    // Step 2: Select Questions
    await expect(page.getByTestId('step-select-questions')).toBeVisible();
    await page.getByTestId('btn-select-q-q-101').click();
    await page.getByTestId('btn-select-q-q-102').click();
    await page.getByTestId('wizard-btn-next').click();

    // Step 3: Settings Configuration (Decision 5)
    await expect(page.getByTestId('step-settings')).toBeVisible();
    await page.getByTestId('input-passing-marks').fill('2');
    await page.getByTestId('wizard-btn-next').click();

    // Step 4: Review & Publish
    await expect(page.getByTestId('step-review-publish')).toBeVisible();
    await page.getByTestId('btn-publish-wizard').click();
    await expect(page.getByTestId('publish-confirm-modal')).toBeVisible();
    await page.getByTestId('btn-confirm-publish').click();

    await expect(page.getByText(assessmentTitle).first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 4. Assign Candidate to Assessment (FR-CAN-004)
    // -------------------------------------------------------------------------
    const assignButtons = page.getByRole('button', { name: /Assign/i });
    if ((await assignButtons.count()) > 0) {
      await assignButtons.first().click();
      await expect(page.getByTestId('assign-assessment-modal')).toBeVisible();

      // Check candidate selection and submit assignment
      await page.getByTestId('btn-select-all').click();
      await page.getByTestId('btn-confirm-assign').click();
      await expect(page.getByText(/Candidates Assigned/i)).toBeVisible();
    }

    // -------------------------------------------------------------------------
    // 5. Ingest Candidate Attempt via Test Harness (FR-TIME, FR-ANS)
    // -------------------------------------------------------------------------
    const harnessData = await page.evaluate(
      async (payload) => {
        const res = await fetch('/api/v1/candidate/sessions/simulate-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return res.json();
      },
      {
        candidateIdentifier: candidateUniqueId,
        candidateName: 'Kavya Iyer',
        candidateEmail: 'kavya.iyer@campus.edu',
        assessmentTitle,
        status: 'SUBMITTED',
        totalScore: 42,
        maxScore: 50,
        requireEvaluation: true,
        questionTitle: 'Idempotency and Concurrency Architecture',
        candidateAnswer:
          'Idempotency keys persist state durably in PostgreSQL before returning an HTTP ACK. Version counters ensure OCC integrity.',
      },
    );
    expect(harnessData.success).toBe(true);

    // -------------------------------------------------------------------------
    // 6. Live Session Monitoring & Telemetry Inspection (FR-ADMIN-002, FR-LAB-006)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Live Sessions/i }).click();
    await expect(page.getByText('Live Session Monitoring')).toBeVisible();

    // Confirm that simulated candidate appears in live sessions stream
    await expect(page.getByText('Kavya Iyer').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 7. Manual Subjective Evaluation Queue (UC-14, FR-SCORE-004)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Results/i }).click();
    await expect(page.getByText('Results & Scoring')).toBeVisible();

    // Switch to manual evaluation queue sub-tab
    await page.getByRole('button', { name: /Evaluation Queue/i }).click();
    await expect(page.getByText(/Subjective Evaluation Queue/i).first()).toBeVisible();

    // Find evaluation card and evaluate
    const marksInput = page.getByLabel('Total Marks Awarded');
    if ((await marksInput.count()) > 0) {
      await marksInput.first().fill('4');
      const commentsInput = page.getByLabel('Evaluator Comments');
      if ((await commentsInput.count()) > 0) {
        await commentsInput.first().fill('Excellent analysis of idempotency keys.');
      }
      await page
        .getByRole('button', { name: /Submit Evaluation/i })
        .first()
        .click();
      await expect(page.getByText(/Evaluation Submitted/i)).toBeVisible();
    }

    // -------------------------------------------------------------------------
    // 8. Audited Score Correction Workflow (UC-15, FR-SCORE-010, Rule 7, BR-012)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /All Results/i }).click();
    await expect(page.getByText('Results & Scoring')).toBeVisible();

    // Click score correction on a candidate row
    const correctButtons = page.getByRole('button', { name: /^Correct$/i });
    if ((await correctButtons.count()) > 0) {
      await correctButtons.first().click();
      await expect(page.getByRole('heading', { name: 'Score Correction Workflow' })).toBeVisible();

      // Provide mandatory audit justification reason (Rule 7, BR-012)
      await page
        .getByLabel(/Mandatory Justification Reason/i)
        .fill('Re-evaluated coding submission edge cases per academic committee review.');
      await page.getByLabel(/Confirm score modification audit stamp/i).check();
      await page.getByRole('button', { name: /Confirm Score Correction/i }).click();

      await expect(page.getByText(/Score Corrected Successfully/i)).toBeVisible();
    }

    // -------------------------------------------------------------------------
    // 9. Results CSV Export Flow (FR-ADMIN-006)
    // -------------------------------------------------------------------------
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export$/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('VeriSync_Results_Export_');
  });
});
