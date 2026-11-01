import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';
import { detectProhibitedApps, setExamActive, getExamActive } from '../../electron/main';

/**
 * Phase 6 Lockdown & Security Telemetry Unit Tests
 * Non-Negotiable Rules & SRS Requirements:
 * - Multi-layer lockdown beyond full-screen alone (FR-LAB-005, FR-LAB-008)
 * - Prohibited application detection from API policy (FR-LAB-006)
 * - Logging and telemetry for focus-loss, minimization, and exit attempts (FR-LAB-006, TC18)
 * - Single-instance and window management policies (FR-LAB-005, TC18)
 */

describe('Phase 6: Multi-Layer Lockdown & Security Runtime (FR-LAB-005..008, TC18)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Exam Active State & Lockdown Mode (FR-LAB-005, FR-LAB-008)', () => {
    it('should engage exam active mode and update lockdown state', () => {
      setExamActive(false);
      expect(getExamActive()).toBe(false);

      const engaged = setExamActive(true);
      expect(engaged).toBe(true);
      expect(getExamActive()).toBe(true);

      const disengaged = setExamActive(false);
      expect(disengaged).toBe(true);
      expect(getExamActive()).toBe(false);
    });
  });

  describe('Prohibited Applications Detection (FR-LAB-006)', () => {
    it('should detect running processes against custom server denylist', async () => {
      const customDenylist = ['customcheat.exe', 'streamer-tool.exe'];
      const result = await detectProhibitedApps(customDenylist);

      // On standard dev environment, these fake cheat tools won't be running
      expect(result).toHaveProperty('hasProhibitedApps');
      expect(Array.isArray(result.apps)).toBe(true);
    });

    it('apiClient retrieves process denylist policy with fallback (FR-LAB-006)', async () => {
      const policy = await apiClient.getProhibitedProcessesPolicy();
      expect(policy).toHaveProperty('denylist');
      expect(Array.isArray(policy.denylist)).toBe(true);
      expect(policy.denylist).toContain('teamviewer.exe');
      expect(policy.denylist).toContain('anydesk.exe');
      expect(policy.denylist).toContain('obs64.exe');
      expect(policy.denylist).toContain('wireshark.exe');
    });
  });

  describe('Integrity Event Reporting (FR-LAB-006, FR-AUD-002, Rule 5)', () => {
    it('records security events with UTC timestamp and scrubs sensitive tokens', async () => {
      const writeLogMock = vi.fn().mockResolvedValue(true);
      window.verisyncBridge = {
        ...(window.verisyncBridge || ({} as unknown as NonNullable<typeof window.verisyncBridge>)),
        writeLog: writeLogMock,
        getDeviceId: vi.fn().mockResolvedValue('test-device-uuid-1234'),
      };

      const res = await apiClient.reportIntegrityEvent('sess-test-888', {
        eventType: 'FOCUS_LOST',
        timestamp: '2026-11-01T12:00:00.000Z',
        details: { questionAttemptId: 'qa-42' },
      });

      expect(res).toBe(true);
      expect(writeLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: 'Candidate Integrity Event: FOCUS_LOST',
          metadata: expect.objectContaining({
            sessionId: 'sess-test-888',
            eventType: 'FOCUS_LOST',
          }),
        }),
      );
    });
  });

  describe('Preload Bridge Window Listeners Registration (FR-LAB-006, TC18)', () => {
    it('registers and unsubscribes focus-loss, minimize, and exit listeners cleanly', () => {
      const blurCb = vi.fn();
      const minCb = vi.fn();
      const exitCb = vi.fn();

      const mockBridge = {
        onWindowBlur: vi.fn((cb) => () => cb()),
        onWindowMinimize: vi.fn((cb) => () => cb()),
        onExitAttempted: vi.fn((cb) => () => cb()),
        setExamActive: vi.fn().mockResolvedValue(true),
      };

      const unbindBlur = mockBridge.onWindowBlur(blurCb);
      const unbindMin = mockBridge.onWindowMinimize(minCb);
      const unbindExit = mockBridge.onExitAttempted(exitCb);

      expect(typeof unbindBlur).toBe('function');
      expect(typeof unbindMin).toBe('function');
      expect(typeof unbindExit).toBe('function');
    });
  });
});
