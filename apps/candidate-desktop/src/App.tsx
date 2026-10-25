import React from 'react';
import { ShieldCheck, MonitorCheck, Lock, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck style={{ width: 28, height: 28, color: '#3b82f6' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>VeriSync</h1>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Secure Candidate Client</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#064e3b',
              color: '#34d399',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <MonitorCheck style={{ width: 14, height: 14 }} />
            <span>Kiosk Shell Initialized</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>v1.1.0</span>
        </div>
      </header>

      {/* Main Login / Welcome Panel */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: 16,
            border: '1px solid #334155',
            padding: 32,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Lock style={{ width: 28, height: 28, color: '#60a5fa' }} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>
              Welcome to VeriSync
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
              Sign in with your issued Candidate ID or Username to begin your examination.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="candidate-identifier"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: '#cbd5e1',
                }}
              >
                Candidate ID / Username
              </label>
              <input
                id="candidate-identifier"
                type="text"
                placeholder="e.g. CAN-2026-081"
                disabled
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                htmlFor="candidate-password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: '#cbd5e1',
                }}
              >
                Password
              </label>
              <input
                id="candidate-password"
                type="password"
                placeholder="••••••••••••"
                disabled
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              />
            </div>

            <button
              disabled
              style={{
                marginTop: 8,
                padding: '12px 20px',
                borderRadius: 8,
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'not-allowed',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>Continue to System Check</span>
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <p
            style={{
              marginTop: 24,
              marginBottom: 0,
              textAlign: 'center',
              fontSize: 12,
              color: '#64748b',
            }}
          >
            Phase 0 Scaffold Active &bull; Auth modules wired in Phase 1
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '12px 32px',
          textAlign: 'center',
          fontSize: 12,
          color: '#64748b',
          borderTop: '1px solid #1e293b',
        }}
      >
        Candidate Desktop Shell &bull; Institutional Lockdown Mode
      </footer>
    </div>
  );
};

export default App;
