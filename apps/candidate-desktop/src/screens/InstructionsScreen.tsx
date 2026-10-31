import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Layers,
  ShieldAlert,
  ArrowRight,
  AlertOctagon,
  Eye,
  Smartphone,
  Lock,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { MockAssessmentSession, MockUser } from '../services/mockApi';

/**
 * Assessment Instructions Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 3: Assessment Instructions)
 * SRS Requirements:
 * - FR-UI-001: Assigned assessment metrics display
 * - FR-UI-002: Mandatory instructions displayed and explicitly acknowledged before starting
 * - FR-TIME-002: Server records start timestamp upon commencement
 */

interface InstructionsScreenProps {
  user: MockUser;
  onStartExam: (session: MockAssessmentSession) => void;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({ user, onStartExam }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (!acknowledged || isStarting) return;
    setIsStarting(true);
    try {
      const session = await apiClient.startAssessment(user.candidateId);
      onStartExam(session);
    } finally {
      setIsStarting(false);
    }
  };

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
          maxWidth: 680,
          backgroundColor: '#111827',
          borderRadius: 16,
          border: '1px solid #1f2937',
          padding: 36,
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            Assessment Instructions
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
            Candidate: <span style={{ color: '#60a5fa', fontWeight: 600 }}>{user.candidateId}</span>{' '}
            &bull; {user.username}
          </p>
        </div>

        {/* Overview Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#1f2937',
              borderRadius: 10,
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <FileText size={22} color="#60a5fa" />
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Total Questions
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>20</div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#1f2937',
              borderRadius: 10,
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Clock size={22} color="#34d399" />
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Total Duration
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>90 Minutes</div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#1f2937',
              borderRadius: 10,
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Layers size={22} color="#fbbf24" />
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Question Types
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                MCQ, Coding, SQL
              </div>
            </div>
          </div>
        </div>

        {/* Guidelines List per UI Sample & Decisions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: '#1f2937',
            padding: 20,
            borderRadius: 10,
            border: '1px solid #374151',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AlertOctagon size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              <strong>Lockdown mode:</strong> Do not attempt to switch applications, minimize the
              window, or launch prohibited tools.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Eye size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              <strong>Audit Logging:</strong> Window focus loss and abnormal process events are
              logged with timestamps (FR-LAB-006).
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Smartphone size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              Do not use mobile phones, headphones, or external electronic devices during the
              session.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Lock size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              <strong>Sequential Progression:</strong> Questions must be answered in sequence. Once
              submitted or timed out, past questions cannot be revisited (FR-UI-004, Decision 1).
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <ShieldAlert size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#f87171' }}>
              Any suspicious activity, tampering, or policy violations will result in immediate
              disqualification.
            </span>
          </div>
        </div>

        {/* Mandatory Acknowledgment Checkbox (FR-UI-002) */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: acknowledged ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: `1px solid ${acknowledged ? '#3b82f6' : '#374151'}`,
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              id="acknowledge-instructions"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{
                width: 18,
                height: 18,
                cursor: 'pointer',
                accentColor: '#2563eb',
              }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: acknowledged ? '#f8fafc' : '#cbd5e1' }}
            >
              I have read and understood the instructions.
            </span>
          </label>
        </div>

        {/* Action Button */}
        <button
          onClick={handleStart}
          disabled={!acknowledged || isStarting}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 8,
            backgroundColor: acknowledged ? '#2563eb' : '#374151',
            color: '#ffffff',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            cursor: acknowledged ? 'pointer' : 'not-allowed',
            opacity: acknowledged ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: acknowledged ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span>{isStarting ? 'Starting Session...' : 'Start Test'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
