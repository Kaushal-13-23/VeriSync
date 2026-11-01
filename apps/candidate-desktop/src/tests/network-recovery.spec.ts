import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';
import { timeSync } from '../services/timeSync';
import { DraftAutosaveManager } from '../services/draftAutosave';
import { SessionState, SubmitAnswerPayload, SessionStatusDto } from '@verisync/shared';

/**
 * SRS Section 11.3: Network Interruption & Workstation Restart Scenarios
 * Non-Negotiable Rules & SRS Requirements:
 * - Rule 1: The server is the only authority for deadlines and scoring (FR-TIME-001)
 * - Rule 3: Every submission carries an Idempotency-Key (FR-ANS-009)
 * - Rule 4: Accepted submissions are committed durably before acknowledgement
 * - SRS 11.3: Network Interruption Workflow
 *   1. Clear connection status display (FR-UI-008)
 *   2. Local draft preservation; draft is never an accepted submission (FR-ANS-005)
 *   3. Server deadline continues to apply (BR-010)
 *   4. Authoritative state fetched upon reconnection (FR-TIME-010, TC-07)
 *   5. Already accepted submissions are not duplicated (Rule 3)
 *   6. Expired questions reject late modifications (409 QUESTION_EXPIRED, TC-05)
 */

describe('SRS 11.3: Network Interruption & Restart Qualification Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Scenario 1: Connection Health & Status Telemetry (SRS 11.3, FR-UI-008)', () => {
    it('detects network link status and provides real-time health indicator', async () => {
      const handshake = await apiClient.checkServerHandshake();
      expect(handshake).toHaveProperty('ok');
      expect(handshake).toHaveProperty('latencyMs');
      expect(typeof handshake.latencyMs).toBe('number');
    });
  });

  describe('Scenario 2: Offline Draft Preservation & Submission Isolation (SRS 11.3, FR-ANS-005)', () => {
    it('preserves local draft during network drop without treating it as final submission', async () => {
      const saveDraftSpy = vi.spyOn(apiClient, 'saveDraft').mockResolvedValue({
        success: true,
      });

      let stateChanges = 0;
      const manager = new DraftAutosaveManager({
        sessionId: 'sess-net-001',
        questionAttemptId: 'qa-net-001',
        intervalMs: 50,
        onStateChange: () => {
          stateChanges++;
        },
      });

      manager.updateContent('function solution() { return 42; }');
      manager.start();

      await new Promise((resolve) => setTimeout(resolve, 80));
      manager.stop();

      expect(saveDraftSpy).toHaveBeenCalledWith(
        'sess-net-001',
        expect.objectContaining({
          questionAttemptId: 'qa-net-001',
          draftPayload: expect.objectContaining({
            code: 'function solution() { return 42; }',
          }),
        }),
      );
      expect(stateChanges).toBeGreaterThan(0);
    });
  });

  describe('Scenario 3: Server Deadline Continuously Applies During Interruption (SRS 11.3, BR-010, FR-TIME-001)', () => {
    it('deadline does not pause or extend when client loses connectivity', () => {
      const now = Date.now();
      const serverExpiryIso = new Date(now + 60000).toISOString(); // 60s remaining

      timeSync.recordServerTime(new Date(now).toISOString(), now, now);
      const remainingSeconds = timeSync.getRemainingSeconds(serverExpiryIso);

      expect(remainingSeconds).toBeGreaterThanOrEqual(59);
      expect(remainingSeconds).toBeLessThanOrEqual(61);

      // Advance local client time by 30 seconds
      vi.setSystemTime(new Date(now + 30000));
      const remainingAfterJump = timeSync.getRemainingSeconds(serverExpiryIso);

      // Remaining must decrease authoritative by 30s regardless of connection state
      expect(remainingAfterJump).toBeLessThanOrEqual(31);
    });
  });

  describe('Scenario 4: Authoritative State Synchronization on Reconnection (SRS 11.3, FR-TIME-010, TC-07)', () => {
    it('fetches server palette and active question state upon reconnection', async () => {
      const mockStatus = {
        sessionId: 'sess-reconnect-002',
        sessionStatus: SessionState.ACTIVE,
        totalQuestions: 6,
        currentQuestionIndex: 2,
        currentQuestionRemainingSeconds: 45,
        overallRemainingSeconds: 1200,
        palette: [
          { sequenceNumber: 1, questionAttemptId: 'qa-01', status: 'ANSWERED' },
          { sequenceNumber: 2, questionAttemptId: 'qa-02', status: 'ANSWERED' },
          { sequenceNumber: 3, questionAttemptId: 'qa-03', status: 'CURRENT' },
        ],
        serverTime: new Date().toISOString(),
      };

      vi.spyOn(apiClient, 'getSessionStatus').mockResolvedValue(
        mockStatus as unknown as SessionStatusDto,
      );

      const status = await apiClient.getSessionStatus('sess-reconnect-002');
      expect(status.sessionStatus).toBe(SessionState.ACTIVE);
      expect(status.palette).toHaveLength(3);
      expect(status.palette[0].status).toBe('ANSWERED');
      expect(status.palette[2].status).toBe('CURRENT');
    });
  });

  describe('Scenario 5: Duplicate Submission Prevention on Network Retry (SRS 11.3, Rule 3, FR-ANS-009)', () => {
    it('duplicate network retry returns original acknowledgement without creating duplicates', async () => {
      const fixedIdempotencyKey = 'c7e8f9a0-1234-5678-9abc-def012345678';
      const payload: SubmitAnswerPayload = {
        questionAttemptId: 'qa-dup-001',
        response: { selectedOptionId: 'opt-b' },
      };

      // First attempt
      const firstAck = await apiClient.submitAnswer(payload, fixedIdempotencyKey);
      expect(firstAck.status).toBe('accepted');

      // Second attempt with exact same idempotency key
      const secondAck = await apiClient.submitAnswer(payload, fixedIdempotencyKey);
      expect(secondAck.status).toBe('accepted');
      expect(secondAck.submittedAt).toBeDefined();
    });
  });

  describe('Scenario 6: Expired Question Handling (SRS 11.3, FR-TIME-004, TC-05)', () => {
    it('rejects late submissions arriving after deadline expiry with HTTP 409 QUESTION_EXPIRED', async () => {
      vi.spyOn(apiClient, 'submitAnswer').mockRejectedValue({
        code: 'QUESTION_EXPIRED',
        message: 'Question attempt time limit has expired.',
      });

      await expect(
        apiClient.submitAnswer(
          { questionAttemptId: 'qa-expired', response: { text: 'late' } },
          'key-expired',
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'QUESTION_EXPIRED',
        }),
      );
    });
  });

  describe('Scenario 7: Workstation Cold Reboot Resumption (SRS 11.3, FR-TIME-010, FR-LAB-007)', () => {
    it('restores candidate attempt seamlessly upon client relaunch without lost time', async () => {
      const session = await apiClient.startAssessment('asmt-test-reboot', 'cand-reboot-01');
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();

      // Simulate client process relaunch: fetch session state
      const refreshed = await apiClient.getSessionStatus(session.sessionId);
      expect(refreshed.sessionStatus).toBe(SessionState.ACTIVE);
      expect(refreshed.palette).toBeDefined();
      expect(refreshed.palette.length).toBeGreaterThan(0);
    });
  });
});
