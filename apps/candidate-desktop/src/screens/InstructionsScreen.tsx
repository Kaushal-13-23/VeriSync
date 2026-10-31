import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Layers,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Lock,
  Eye,
  Smartphone,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { MockAssessmentSession, MockUser } from '../services/mockApi';
import { CandidateAssignedAssessment } from '../types/assessment';
import { handleApiError, UserFacingError } from '../services/errorHandler';

/**
 * Assessment Instructions Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 3: Assessment Instructions)
 * SRS Requirements:
 * - FR-UI-001: Assigned assessment metrics display
 * - FR-UI-002: Mandatory instructions displayed and explicitly acknowledged before starting
 * - BR-015: Candidates are told about monitoring, lockdown, and integrity policies before starting
 * - FR-TIME-002: Server records start timestamp upon commencement
 */

interface InstructionsScreenProps {
  user: MockUser;
  assessment: CandidateAssignedAssessment | null;
  onStartExam: (session: MockAssessmentSession) => void;
  onBack?: () => void;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({
  user,
  assessment,
  onStartExam,
  onBack,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<UserFacingError | null>(null);

  const totalQuestions = assessment?.totalQuestions || 40;
  const totalDuration = assessment?.overallDuration || 90;
  const assessmentTitle = assessment?.title || 'Frontend Developer Assessment';
  const assessmentId = assessment?.assessmentId || 'asmt-frontend-2026';

  const handleStart = async () => {
    if (!acknowledged || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const session = await apiClient.startAssessment(assessmentId, user.candidateId);
      onStartExam(session);
    } catch (err) {
      const mapped = handleApiError(err);
      setError(mapped);
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
        {/* Navigation Bar / Title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Assessment Instructions
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              {assessmentTitle} &bull; Candidate:{' '}
              <strong style={{ color: '#93c5fd' }}>{user.candidateId}</strong>
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              disabled={isStarting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 6,
                color: '#cbd5e1',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Error Callout if Start Fails */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 14,
              borderRadius: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              marginBottom: 20,
            }}
          >
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{error.title}</div>
              <div style={{ fontSize: 12, color: '#fca5a5' }}>
                {error.message} {error.actionHint && `— ${error.actionHint}`}
              </div>
            </div>
          </div>
        )}

        {/* Summary Rows per UI Sample (Screen 3) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#1f2937',
              borderRadius: 8,
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={18} color="#60a5fa" />
              <span style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 500 }}>
                Total Questions
              </span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              {totalQuestions}
            </span>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#1f2937',
              borderRadius: 8,
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock size={18} color="#34d399" />
              <span style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 500 }}>
                Total Duration
              </span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              {totalDuration} Minutes
            </span>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#1f2937',
              borderRadius: 8,
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Layers size={18} color="#fbbf24" />
              <span style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 500 }}>
                Question Types
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              MCQ, Coding, SQL
            </span>
          </div>
        </div>

        {/* Rules List per UI Sample */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            backgroundColor: '#1f2937',
            padding: 18,
            borderRadius: 10,
            border: '1px solid #374151',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Lock size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              Do not switch applications or use browser.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Eye size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              Your session and active window will be monitored.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Smartphone size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              Do not use mobile phones or external devices.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <HelpCircle size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#e5e7eb' }}>
              Attempt all questions. Sequential navigation is enforced per exam policy.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ShieldAlert size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#f87171' }}>
              Any suspicious activity or policy breach may lead to disqualification.
            </span>
          </div>
        </div>

        {/* Monitoring & Lockdown Policy Text (BR-015, FR-UI-002) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 14,
            borderRadius: 8,
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            marginBottom: 24,
          }}
        >
          <Lock size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
            <strong style={{ color: '#93c5fd' }}>BR-015 Policy Disclosure:</strong> This assessment
            operates in a secured lockdown environment. System focus loss, unauthorized shortcut key
            combinations, external display changes, or blacklisted background tools will generate
            audit events with server-validated timestamps.
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
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: acknowledged ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
              border: `1px solid ${acknowledged ? '#2563eb' : '#374151'}`,
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
            cursor: acknowledged && !isStarting ? 'pointer' : 'not-allowed',
            opacity: acknowledged && !isStarting ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: acknowledged ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span>{isStarting ? 'Starting Test...' : 'Start Test'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
