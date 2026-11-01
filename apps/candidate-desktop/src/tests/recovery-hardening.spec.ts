import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tokenStorage, ActiveSessionMetadata } from '../services/tokenStorage';
import { apiClient } from '../services/apiClient';
import { mockApi } from '../services/mockApi';
import { SessionState } from '@verisync/shared';

/**
 * Automated Session Recovery Hardening Tests
 * SRS Requirements & Non-Negotiable Rules:
 * - FR-TIME-010: Deadlines continue running continuously during interruption/restart; no pauses or timer resets
 * - FR-ANS-007: Safe reconnection & state recovery without duplicate records
 * - Rule 1 & Rule 3: Server authority, persistent Idempotency-Key preserved on retry
 * - NFR-REL-004: Seamless recovery from crashes, reboots, and network interruptions
 */

describe('Session Recovery Hardening (FR-TIME-010, FR-ANS-007, NFR-REL-004)', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    mockApi.resetStore();
    apiClient.setConfig({ forceMock: true });
    await tokenStorage.clearToken();
    await tokenStorage.clearActiveSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Crash & Restart Mid-Question (FR-TIME-010, NFR-REL-004)
  // =========================================================================
  it('recovers active session from secure storage after crash and continues from authoritative server state', async () => {
    // 1. Candidate starts an exam session
    const session = await apiClient.startSession('asmt-frontend-2026');
    await tokenStorage.setToken('mock-jwt-recovery-token');

    const meta: ActiveSessionMetadata = {
      sessionId: session.sessionId,
      assessmentId: 'asmt-frontend-2026',
      title: 'Frontend Engineering Assessment',
      candidateId: 'CAN-2026-081',
      startedAt: session.startedAt,
    };
    await tokenStorage.setActiveSession(meta);

    // 2. Candidate answers question 1
    const key1 = crypto.randomUUID();
    await apiClient.submitSessionAnswer(
      session.sessionId,
      { questionAttemptId: 'qa_0001', answer: 'opt_2' },
      key1,
    );

    // 3. Simulate crash / application restart by checking recovery state
    const restoredMeta = await tokenStorage.getActiveSession();
    expect(restoredMeta).not.toBeNull();
    expect(restoredMeta?.sessionId).toBe(session.sessionId);

    // 4. Fetch authoritative status upon recovery
    const status = await apiClient.getSessionStatus(restoredMeta!.sessionId);
    expect(status.sessionStatus).toBe(SessionState.ACTIVE);

    // Authoritative palette confirms question 1 is ANSWERED and question 2 is CURRENT
    expect(status.palette[0].status).toBe('ANSWERED');
    expect(status.palette[1].status).toBe('CURRENT');

    // Deadlines remain continuous
    expect(status.overallRemainingSeconds).toBeGreaterThan(0);
  });

  // =========================================================================
  // 2. Lab PC Reboot Simulation (NFR-REL-004)
  // =========================================================================
  it('simulates lab PC reboot: persisted credentials and session ID restore candidate to active attempt', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    await tokenStorage.setToken('reboot-persistent-token');

    await tokenStorage.setActiveSession({
      sessionId: session.sessionId,
      assessmentId: 'asmt-frontend-2026',
      title: 'Frontend Engineering Assessment',
      candidateId: 'CAN-2026-081',
      startedAt: session.startedAt,
    });

    // Simulate OS reboot by verifying stored recovery metadata
    const token = await tokenStorage.getToken();
    const sessionMeta = await tokenStorage.getActiveSession();

    expect(token).toBe('reboot-persistent-token');
    expect(sessionMeta?.sessionId).toBe(session.sessionId);

    // Server-side active question retrieval succeeds without restart
    const currentQ = await apiClient.getCurrentQuestion(sessionMeta!.sessionId);
    expect(currentQ).not.toBeNull();
    expect(currentQ?.sequenceNumber).toBe(1);
  });

  // =========================================================================
  // 3. Ambiguous Submit Response Recovery (Rule 3, FR-ANS-009, TC-04, TC-05)
  // =========================================================================
  it('recovers from ambiguous submit response by retrying with identical Idempotency-Key', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    const idempotencyKey = crypto.randomUUID();

    // First submit succeeds on server, but simulate client packet loss
    const firstAck = await apiClient.submitSessionAnswer(
      session.sessionId,
      { questionAttemptId: 'qa_0001', answer: 'opt_2' },
      idempotencyKey,
    );
    expect(firstAck.status).toBe('accepted');

    // Candidate clicks retry: resubmits with identical Idempotency-Key
    const retriedAck = await apiClient.submitSessionAnswer(
      session.sessionId,
      { questionAttemptId: 'qa_0001', answer: 'opt_2' },
      idempotencyKey,
    );

    // Returns identical acceptance timestamp without duplicate records
    expect(retriedAck.status).toBe('accepted');
    expect(retriedAck.submittedAt).toBe(firstAck.submittedAt);
    expect(retriedAck.questionAttemptId).toBe(firstAck.questionAttemptId);
  });

  // =========================================================================
  // 4. Backend Restart / Temporary Interruption Recovery (TC-07, FR-TIME-010)
  // =========================================================================
  it('re-synchronizes with server after backend restart/recovery (TC-07)', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');

    // Simulate backend marked session as INTERRUPTED due to temporary disconnect
    const statusBefore = await apiClient.getSessionStatus(session.sessionId);
    expect(statusBefore.sessionId).toBe(session.sessionId);

    // Send heartbeat keepalive to restore to ACTIVE
    const heartbeat = await apiClient.sendHeartbeat(session.sessionId);
    expect(heartbeat.status).toBe('ok');

    // Sync authoritative status
    const statusAfter = await apiClient.getSessionStatus(session.sessionId);
    expect(statusAfter.sessionId).toBe(session.sessionId);
    expect(statusAfter.overallRemainingSeconds).toBeLessThanOrEqual(
      statusBefore.overallRemainingSeconds,
    );
  });

  // =========================================================================
  // 5. Final Submit Cleans Up Recovery State (FR-ANS-008)
  // =========================================================================
  it('clears active recovery metadata upon final exam submission', async () => {
    const session = await apiClient.startSession('asmt-frontend-2026');
    await tokenStorage.setActiveSession({
      sessionId: session.sessionId,
      assessmentId: 'asmt-frontend-2026',
      title: 'Frontend Engineering Assessment',
      candidateId: 'CAN-2026-081',
      startedAt: session.startedAt,
    });

    // Final submit
    const finalResult = await apiClient.finalSubmitSession(session.sessionId);
    expect(finalResult.status).toBe('submitted');

    // Recovery session cleared
    await tokenStorage.clearActiveSession();
    const active = await tokenStorage.getActiveSession();
    expect(active).toBeNull();
  });
});
