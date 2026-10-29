import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { timeSync } from '../../services/timeSync';

/**
 * Server-Driven Countdown Timer Component with Drift Correction
 * Source of truth: docs/SRS/srs.md (FR-TIME-001, FR-TIME-003, FR-TIME-008, FR-UI-004, TC-01)
 *
 * NON-NEGOTIABLE RULE 1 & TC-01 LOGIC:
 * - The server is the ONLY authority for deadlines and acceptance.
 * - Changing the candidate computer's local clock does NOT alter the server deadline.
 * - This component recalculates remaining time against the server deadline with clock offset
 *   drift compensation. The display is strictly a visual aid; acceptance is determined solely
 *   by the server when the submission arrives (FR-TIME-004, TC-01).
 */

export interface TimerComponentProps {
  serverDeadline: string; // Authoritative UTC ISO-8601 timestamp
  onExpire?: () => void;
  lowTimeThresholdSeconds?: number; // default: 300s (5 mins)
  criticalThresholdSeconds?: number; // default: 60s (1 min)
  label?: string; // e.g. "Question Time" or "Overall Time"
}

export function computeRemainingSeconds(serverDeadline: string, clockOffsetMs: number = 0): number {
  const deadlineMs = new Date(serverDeadline).getTime();
  if (isNaN(deadlineMs)) return 0;
  // Authoritative estimated server time = client timestamp + calculated offset
  const serverNow = Date.now() + clockOffsetMs;
  const remainingMs = deadlineMs - serverNow;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

export function formatTimeDisplay(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export const TimerComponent: React.FC<TimerComponentProps> = ({
  serverDeadline,
  onExpire,
  lowTimeThresholdSeconds = 300,
  criticalThresholdSeconds = 60,
  label,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    computeRemainingSeconds(serverDeadline, timeSync.getClockOffsetMs())
  );

  useEffect(() => {
    // Immediate calculation with current offset
    const currentOffset = timeSync.getClockOffsetMs();
    const initialRemaining = computeRemainingSeconds(serverDeadline, currentOffset);
    setSecondsRemaining(initialRemaining);

    // Periodic tick with continuous drift correction against server deadline (FR-TIME-008, TC-01)
    const interval = setInterval(() => {
      const offset = timeSync.getClockOffsetMs();
      const remaining = computeRemainingSeconds(serverDeadline, offset);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverDeadline, onExpire]);

  const isLowTime = secondsRemaining <= lowTimeThresholdSeconds && secondsRemaining > criticalThresholdSeconds;
  const isCritical = secondsRemaining <= criticalThresholdSeconds;
  const isExpired = secondsRemaining === 0;

  // Visual styling matching docs/design/UI_Sample.jpeg header pill
  const getBackgroundColor = () => {
    if (isExpired) return 'rgba(239, 68, 68, 0.25)';
    if (isCritical) return 'rgba(239, 68, 68, 0.18)';
    if (isLowTime) return 'rgba(245, 158, 11, 0.18)';
    return '#1e293b';
  };

  const getBorderColor = () => {
    if (isExpired) return '#ef4444';
    if (isCritical) return '#f87171';
    if (isLowTime) return '#f59e0b';
    return '#334155';
  };

  const getTextColor = () => {
    if (isExpired) return '#ef4444';
    if (isCritical) return '#f87171';
    if (isLowTime) return '#fbbf24';
    return '#f8fafc';
  };

  return (
    <div
      role="timer"
      aria-label={label || 'Assessment countdown timer'}
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        borderRadius: 20,
        backgroundColor: getBackgroundColor(),
        border: `1.5px solid ${getBorderColor()}`,
        color: getTextColor(),
        fontFamily: 'monospace, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        boxShadow: isCritical ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {isCritical || isExpired ? (
        <AlertTriangle size={15} color={getTextColor()} />
      ) : (
        <Clock size={15} color={isLowTime ? '#f59e0b' : '#94a3b8'} />
      )}

      {label && (
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: '#94a3b8',
          }}
        >
          {label}:
        </span>
      )}

      <span style={{ minWidth: '4.8ch', textAlign: 'center' }}>
        {formatTimeDisplay(secondsRemaining)}
      </span>

      {isExpired && (
        <span
          style={{
            fontSize: 11,
            color: '#ef4444',
            fontWeight: 700,
            marginLeft: 2,
          }}
        >
          (EXPIRED)
        </span>
      )}
    </div>
  );
};

