import React, { useEffect, useState } from 'react';
import { ShieldCheck, Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';
import { timeSync, ConnectionStatus } from '../services/timeSync';

/**
 * Top Header & Connection Status Banner
 * SRS Requirements:
 * - FR-UI-004: Server-synchronized countdown timer with low-time warning
 * - FR-UI-008: Connection status indicator notifying candidate of interruptions
 * - FR-TIME-001: Backend authoritative server clock display
 */

interface ConnectionBannerProps {
  assessmentTitle?: string;
  deadlineIsoUtc?: string;
  candidateId?: string;
  onEndTest?: () => void;
  showTimer?: boolean;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  assessmentTitle,
  deadlineIsoUtc,
  candidateId,
  onEndTest,
  showTimer = false,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    timeSync.getConnectionStatus(),
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return deadlineIsoUtc ? timeSync.getRemainingSeconds(deadlineIsoUtc) : 0;
  });

  useEffect(() => {
    const unsubscribe = timeSync.onStatusChange((status) => {
      setConnectionStatus(status);
    });
    return unsubscribe;
  }, []);

  // Countdown timer tick based on authoritative server offset
  useEffect(() => {
    if (!showTimer || !deadlineIsoUtc) return;

    const interval = setInterval(() => {
      const remaining = timeSync.getRemainingSeconds(deadlineIsoUtc);
      setRemainingSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer, deadlineIsoUtc]);

  const isLowTime = showTimer && remainingSeconds > 0 && remainingSeconds <= 300; // < 5 mins warning
  const formattedTimer = timeSync.formatTimeDisplay(remainingSeconds);

  return (
    <header
      style={{
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      {/* Left: Brand / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
          }}
        >
          <ShieldCheck size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}
            >
              VeriSync
            </span>
            {assessmentTitle && (
              <>
                <span style={{ color: '#475569', fontSize: 14 }}>|</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>
                  {assessmentTitle}
                </span>
              </>
            )}
          </div>
          {candidateId && (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Candidate:{' '}
              <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{candidateId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Authoritative Countdown Timer (if Exam active) */}
      {showTimer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 9999,
              backgroundColor: isLowTime ? '#450a0a' : '#1e293b',
              border: `1px solid ${isLowTime ? '#ef4444' : '#334155'}`,
              color: isLowTime ? '#f87171' : '#f8fafc',
              fontWeight: 700,
              fontSize: 16,
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          >
            <Clock size={16} color={isLowTime ? '#ef4444' : '#38bdf8'} />
            <span>{formattedTimer}</span>
            {isLowTime && (
              <span
                style={{
                  fontSize: 10,
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                Low Time
              </span>
            )}
          </div>

          {onEndTest && (
            <button
              onClick={onEndTest}
              type="button"
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              End Test
            </button>
          )}
        </div>
      )}

      {/* Right: Connection Status & Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {connectionStatus === 'online' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #059669',
              color: '#34d399',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Wifi size={13} />
            <span>Server Connected</span>
          </div>
        )}

        {connectionStatus === 'degraded' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid #d97706',
              color: '#fbbf24',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={13} />
            <span>Connecting / Fallback</span>
          </div>
        )}

        {connectionStatus === 'offline' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #dc2626',
              color: '#f87171',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <WifiOff size={13} />
            <span>Network Interrupted</span>
          </div>
        )}

        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>v1.1.0</span>
      </div>
    </header>
  );
};
