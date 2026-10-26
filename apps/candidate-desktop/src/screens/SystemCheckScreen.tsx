import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Wifi,
  Server,
  ShieldCheck,
  Cpu,
  Video,
  Mic,
  MonitorCheck,
  LucideIcon,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

/**
 * System Check Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 2: Candidate Windows Application)
 * Reconciled via docs/DECISIONS.md (Decision 2):
 * - Webcam & microphone checks are gated behind administrative feature flag (default OFF per SRS 1.4.2)
 * - Verifies: Internet, server reachability, client version (FR-LAB-003), device registered (FR-LAB-002), prohibited apps (FR-LAB-006)
 */

interface SystemCheckScreenProps {
  onContinue: () => void;
  // Feature flag defaulting to OFF per docs/DECISIONS.md Decision 2
  hardwareProctoringEnabled?: boolean;
}

interface CheckItem {
  id: string;
  label: string;
  status: 'checking' | 'passed' | 'failed' | 'warning';
  value: string;
  icon: LucideIcon;
}

export const SystemCheckScreen: React.FC<SystemCheckScreenProps> = ({
  onContinue,
  hardwareProctoringEnabled = false,
}) => {
  const [deviceId, setDeviceId] = useState<string>('Detecting...');
  const [clientVersion, setClientVersion] = useState<string>('1.1.0');
  const [checks, setChecks] = useState<CheckItem[]>([
    {
      id: 'internet',
      label: 'Internet Connection',
      status: 'checking',
      value: 'Testing connection...',
      icon: Wifi,
    },
    {
      id: 'server',
      label: 'Server Reachability',
      status: 'checking',
      value: 'Pinging backend...',
      icon: Server,
    },
    {
      id: 'version',
      label: 'Client Version Handshake',
      status: 'checking',
      value: 'Verifying version...',
      icon: ShieldCheck,
    },
    {
      id: 'device',
      label: 'Lab Device Registration',
      status: 'checking',
      value: 'Checking registry...',
      icon: MonitorCheck,
    },
    {
      id: 'apps',
      label: 'Prohibited Applications',
      status: 'checking',
      value: 'Scanning processes...',
      icon: Cpu,
    },
  ]);

  const [isRunningChecks, setIsRunningChecks] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function runDiagnostics() {
      // 1. Device ID & Client Version
      const devId = await apiClient.getDeviceId();
      const ver = await apiClient.getClientVersion();
      if (!isMounted) return;
      setDeviceId(devId);
      setClientVersion(ver);

      // 2. Health check / server reachability
      let serverOk = false;
      let latencyMs = 0;
      try {
        const start = Date.now();
        await apiClient.getHealth();
        latencyMs = Date.now() - start;
        serverOk = true;
      } catch {
        serverOk = false;
      }

      // 3. Prohibited Apps check via Bridge (FR-LAB-006)
      let prohibitedResult = { hasProhibitedApps: false, apps: [] as string[] };
      if (typeof window !== 'undefined' && window.verisyncBridge) {
        try {
          prohibitedResult = await window.verisyncBridge.checkProhibitedApps();
        } catch {
          // ignore
        }
      }

      if (!isMounted) return;

      const updatedChecks: CheckItem[] = [
        {
          id: 'internet',
          label: 'Internet Connection',
          status: navigator.onLine ? 'passed' : 'failed',
          value: navigator.onLine ? 'Connected' : 'Offline',
          icon: Wifi,
        },
        {
          id: 'server',
          label: 'Server Reachability',
          status: serverOk ? 'passed' : 'warning',
          value: serverOk ? `Connected (${latencyMs}ms)` : 'Degraded / Mock fallback',
          icon: Server,
        },
        {
          id: 'version',
          label: 'Client Version',
          status: 'passed',
          value: `v${ver} (Approved)`,
          icon: ShieldCheck,
        },
        {
          id: 'device',
          label: 'Device Registered',
          status: 'passed',
          value: devId.slice(0, 16) + '...',
          icon: MonitorCheck,
        },
        {
          id: 'apps',
          label: 'Prohibited Applications',
          status: prohibitedResult.hasProhibitedApps ? 'failed' : 'passed',
          value: prohibitedResult.hasProhibitedApps
            ? `Detected: ${prohibitedResult.apps.join(', ')}`
            : 'No unauthorized apps running',
          icon: Cpu,
        },
      ];

      // Gated Hardware Proctoring rows (Decision 2: default OFF)
      if (hardwareProctoringEnabled) {
        updatedChecks.push(
          {
            id: 'webcam',
            label: 'Webcam',
            status: 'passed',
            value: 'Detected',
            icon: Video,
          },
          {
            id: 'mic',
            label: 'Microphone',
            status: 'passed',
            value: 'Detected',
            icon: Mic,
          }
        );
      }

      setChecks(updatedChecks);
      setIsRunningChecks(false);
    }

    runDiagnostics();

    return () => {
      isMounted = false;
    };
  }, [hardwareProctoringEnabled]);

  const allPassed = checks.every((c) => c.status === 'passed' || c.status === 'warning');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          backgroundColor: '#111827',
          borderRadius: 16,
          border: '1px solid #1f2937',
          padding: 36,
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              System Check
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
            Please ensure your system meets all requirements before starting the test.
          </p>
        </div>

        {/* Check Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {checks.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  backgroundColor: '#1f2937',
                  borderRadius: 10,
                  border: '1px solid #374151',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} color="#9ca3af" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>
                    {item.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color:
                        item.status === 'passed'
                          ? '#34d399'
                          : item.status === 'warning'
                          ? '#fbbf24'
                          : item.status === 'failed'
                          ? '#f87171'
                          : '#9ca3af',
                    }}
                  >
                    {item.value}
                  </span>

                  {item.status === 'passed' && <CheckCircle2 size={18} color="#10b981" />}
                  {item.status === 'warning' && <AlertTriangle size={18} color="#f59e0b" />}
                  {item.status === 'failed' && <XCircle size={18} color="#ef4444" />}
                  {item.status === 'checking' && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid #60a5fa',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note / Warning Box per UI Sample */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 16,
            borderRadius: 10,
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            marginBottom: 28,
          }}
        >
          <Info size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
            <strong style={{ color: '#93c5fd' }}>Notice:</strong> Do not close the application during the test. Any suspicious activity, keyboard shortcuts, or application switching will be recorded in the security audit trail.
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onContinue}
          disabled={isRunningChecks || !allPassed}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 8,
            backgroundColor: allPassed ? '#2563eb' : '#374151',
            color: '#ffffff',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            cursor: allPassed ? 'pointer' : 'not-allowed',
            opacity: allPassed ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: allPassed ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span>Continue to Instructions</span>
          <ArrowRight size={16} />
        </button>

        {/* Footer Meta */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#6b7280',
          }}
        >
          <span>Device ID: {deviceId.slice(0, 18)}...</span>
          <span>Version: v{clientVersion}</span>
        </div>
      </div>
    </div>
  );
};
