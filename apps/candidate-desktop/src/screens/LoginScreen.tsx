import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, AlertCircle, Laptop } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { MockUser } from '../services/mockApi';
import { ApiErrorResponse } from '@verisync/shared';

/**
 * Candidate Login Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 1: Candidate Windows Application)
 * SRS Requirements:
 * - FR-AUTH-002: Candidate login requiring administrator-issued credentials (no self-registration)
 * - FR-CAN-007: Accepts either Candidate ID or Username (Decision 3)
 * - Non-Negotiable Rule 5: No secrets or credentials logged or exposed
 */

interface LoginScreenProps {
  onLoginSuccess: (user: MockUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both Candidate ID/Username and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.login(identifier.trim(), password);
      onLoginSuccess(response.user);
    } catch (err) {
      const apiErr = err as ApiErrorResponse;
      if (apiErr && apiErr.message) {
        setErrorMessage(apiErr.message);
      } else {
        setErrorMessage('Unable to connect to authentication server. Please contact lab staff.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Left Column: Navy Brand Hero per UI Sample */}
      <div
        style={{
          flex: '1.1',
          background: 'linear-gradient(135deg, #0b1528 0%, #0f1e3d 50%, #1e3a8a 100%)',
          padding: '48px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid #1e293b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              }}
            >
              <ShieldCheck size={28} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                VeriSync
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#93c5fd', fontWeight: 500 }}>
                Secure Assessments. Fair Opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Central Hero Copy */}
        <div style={{ maxWidth: 440, margin: '40px 0' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.15, color: '#ffffff' }}>
            Welcome to <br />
            <span style={{ color: '#60a5fa' }}>VeriSync</span>
          </h2>
          <p style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            Please login with your credentials to start the assessment. Ensure your lab workstation is authorized and no background applications are active.
          </p>

          <div
            style={{
              marginTop: 32,
              padding: 16,
              borderRadius: 12,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Laptop size={28} color="#60a5fa" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                Secure Lab Environment
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Full-screen institutional lockdown active
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Institutional Testing Terminal</span>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>VeriSync v1.1.0</span>
        </div>
      </div>

      {/* Right Column: Candidate Sign-in Card per UI Sample */}
      <div
        style={{
          flex: '0.9',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 60px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
              Candidate Login
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Enter the credentials provided by your test administrator.
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                marginBottom: 20,
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Candidate ID or Username Input */}
            <div>
              <label
                htmlFor="candidate-identifier"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Candidate ID
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  <User size={18} />
                </div>
                <input
                  id="candidate-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your candidate ID"
                  disabled={isLoading}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="candidate-password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  id="candidate-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: 8,
                padding: '13px 20px',
                borderRadius: 8,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 15,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'background-color 0.15s',
              }}
            >
              <span>{isLoading ? 'Verifying...' : 'Login'}</span>
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <p
            style={{
              marginTop: 28,
              fontSize: 12,
              textAlign: 'center',
              color: '#94a3b8',
              lineHeight: 1.5,
            }}
          >
            Candidate credentials must be obtained from an invigilator or placement coordinator.
          </p>
        </div>
      </div>
    </div>
  );
};
