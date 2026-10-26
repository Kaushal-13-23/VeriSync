import { describe, it, expect } from 'vitest';
import { timeSync } from './timeSync';

/**
 * Server Time Synchronization & Countdown Timer Tests
 * SRS Requirements:
 * - FR-TIME-001: Backend authoritative server time computation
 * - FR-TIME-008: Authoritative remaining-time synchronization helper
 * - FR-UI-004: Server-synchronized countdown timer with low-time warning
 * - FR-UI-008: Connection status notifications on network interruptions
 */

describe('timeSync (FR-TIME-001, FR-TIME-008, FR-UI-004, FR-UI-008)', () => {
  it('FR-TIME-001: computes server offset with network latency compensation', () => {
    const sendTimeMs = 1000;
    const recvTimeMs = 1100; // 100ms round trip -> 50ms latency
    const serverTimeIso = new Date(1050 + 5000).toISOString(); // Server is 5000ms ahead

    timeSync.recordServerTime(serverTimeIso, sendTimeMs, recvTimeMs);

    expect(timeSync.getOffsetMs()).toBe(5000);
    expect(timeSync.getConnectionStatus()).toBe('online');
  });

  it('FR-UI-004: formatTimeDisplay formats seconds into HH:MM:SS format', () => {
    // 1 hour, 12 minutes, 45 seconds per UI Sample (01:12:45)
    expect(timeSync.formatTimeDisplay(4365)).toBe('01:12:45');
    expect(timeSync.formatTimeDisplay(65)).toBe('00:01:05');
    expect(timeSync.formatTimeDisplay(0)).toBe('00:00:00');
    expect(timeSync.formatTimeDisplay(-10)).toBe('00:00:00');
  });

  it('FR-TIME-008: getRemainingSeconds calculates non-negative time to deadline', () => {
    const serverNow = timeSync.getSyncedServerTime();
    const futureDeadline = new Date(serverNow.getTime() + 60000).toISOString();
    const remaining = timeSync.getRemainingSeconds(futureDeadline);
    expect(remaining).toBeGreaterThanOrEqual(58);
    expect(remaining).toBeLessThanOrEqual(61);

    const pastDeadline = new Date(serverNow.getTime() - 5000).toISOString();
    expect(timeSync.getRemainingSeconds(pastDeadline)).toBe(0);
  });

  it('FR-UI-008: notifies registered listeners when connection status changes', () => {
    const recordedStatuses: string[] = [];
    const unsubscribe = timeSync.onStatusChange((status) => {
      recordedStatuses.push(status);
    });

    timeSync.setConnectionStatus('degraded');
    timeSync.setConnectionStatus('offline');
    timeSync.setConnectionStatus('online');

    expect(recordedStatuses).toEqual(['degraded', 'offline', 'online']);
    unsubscribe();
  });
});
