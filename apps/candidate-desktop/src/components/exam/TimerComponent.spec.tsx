import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TimerComponent, computeRemainingSeconds, formatTimeDisplay } from './TimerComponent';
import { timeSync } from '../../services/timeSync';

describe('TimerComponent (FR-TIME-001, FR-TIME-008, TC-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    timeSync.setClockOffsetMs(0);
  });

  it('computes remaining seconds accurately with server deadline and clock offset', () => {
    const fixedNow = 1700000000000;
    vi.setSystemTime(fixedNow);

    // Deadline 60 seconds into future
    const deadlineIso = new Date(fixedNow + 60 * 1000).toISOString();
    const remaining = computeRemainingSeconds(deadlineIso, 0);
    expect(remaining).toBe(60);
  });

  it('TC-01 Clock Manipulation: local clock alteration does NOT alter server deadline calculation', () => {
    // TC-01 scenario:
    // Suppose the candidate machine clock is manipulated (skewed forward by 5000ms).
    // The server handshake calculates clockOffsetMs = -5000ms.
    const manipulatedLocalTime = 1700000005000;
    vi.setSystemTime(manipulatedLocalTime);

    const actualServerDeadline = new Date(1700000060000).toISOString(); // 60s from actual server now
    const calculatedOffset = -5000; // Compensates for the 5s local forward skew

    const correctedRemaining = computeRemainingSeconds(actualServerDeadline, calculatedOffset);
    // Corrected remaining should still be exactly 60s (not shortened by local clock advance)
    expect(correctedRemaining).toBe(60);
  });

  it('TC-01 Logic: display is visual aid and never decides acceptance', () => {
    // If deadline has already passed on server, remaining is 0
    const pastDeadline = new Date(Date.now() - 10000).toISOString();
    expect(computeRemainingSeconds(pastDeadline, 0)).toBe(0);
  });

  it('formats time display into mm:ss and hh:mm:ss', () => {
    expect(formatTimeDisplay(45)).toBe('00:45');
    expect(formatTimeDisplay(300)).toBe('05:00');
    expect(formatTimeDisplay(3665)).toBe('01:01:05');
  });

  it('renders countdown timer element and triggers onExpire when deadline reached', () => {
    const onExpire = vi.fn();
    const futureDeadline = new Date(Date.now() + 2000).toISOString();

    render(<TimerComponent serverDeadline={futureDeadline} onExpire={onExpire} />);

    expect(screen.getByRole('timer')).toBeDefined();

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpire).toHaveBeenCalled();
  });
});
