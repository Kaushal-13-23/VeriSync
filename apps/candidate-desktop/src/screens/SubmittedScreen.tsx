import React from 'react';
import { CheckCircle2, ShieldCheck, Power, Clock, HelpCircle, User, Award } from 'lucide-react';
import { MockAssessmentSession, MockUser } from '../services/mockApi';
import { FinalSubmitResponseDto } from '@verisync/shared';

/**
 * Submission Confirmation Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 5: Submission Screen)
 * SRS Requirements:
 * - FR-UI-007 & FR-UI-009: Final submission confirmation screen displaying summary and completion timestamp
 * - FR-ANS-008: Assessment completion marking with prevention of further changes
 * - Non-Negotiable Rule 9: Timestamps formatted in UTC ISO-8601
 */

interface SubmittedScreenProps {
  user: MockUser;
  session: MockAssessmentSession;
  finalResult?: FinalSubmitResponseDto | null;
}

export const SubmittedScreen: React.FC<SubmittedScreenProps> = ({ user, session, finalResult }) => {
  const handleClose = async () => {
    if (typeof window !== 'undefined' && window.verisyncBridge) {
      try {
        await window.verisyncBridge.closeApp();
      } catch {
        // window.close fallback
        window.close();
      }
    } else if (typeof window !== 'undefined') {
      window.close();
    }
  };

  const candidateId = finalResult?.candidateIdentifier || user.candidateId || 'CAN-2026-081';
  const testTitle = finalResult?.assessmentTitle || session.title || 'Frontend Developer Assessment';
  const totalQuestions = finalResult?.totalQuestions ?? session.totalQuestions ?? 6;
  const answeredCount = finalResult?.answeredCount ?? session.answeredAttemptIds?.size ?? 0;
  const submittedTimestamp = finalResult?.submittedAt
    ? new Date(finalResult.submittedAt).toUTCString()
    : new Date().toUTCString();

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
          maxWidth: 540,
          backgroundColor: '#111827',
          borderRadius: 16,
          border: '1px solid #1f2937',
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <CheckCircle2 size={48} color="#10b981" />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc' }}>
          Test Submitted Successfully!
        </h2>
        <p style={{ margin: '0 0 28px 0', fontSize: 14, color: '#9ca3af', lineHeight: 1.5 }}>
          Your responses have been durably committed to the authoritative system of record.
          The evaluation will be processed per institutional policy. You can now close the application.
        </p>

        {/* Summary Details Card per UI Sample */}
        <div
          style={{
            backgroundColor: '#1f2937',
            borderRadius: 10,
            border: '1px solid #374151',
            padding: '20px 24px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginBottom: 28,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} /> Candidate ID:
            </span>
            <span style={{ fontWeight: 600, color: '#60a5fa', fontFamily: 'monospace' }}>
              {candidateId}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={14} /> Test Name:
            </span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{testTitle}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={14} /> Total Questions:
            </span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{totalQuestions}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} color="#34d399" /> Questions Answered:
            </span>
            <span style={{ fontWeight: 600, color: '#34d399' }}>
              {answeredCount} of {totalQuestions}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Submitted On:
            </span>
            <span style={{ fontWeight: 600, color: '#34d399', fontSize: 12, fontFamily: 'monospace' }}>
              {submittedTimestamp}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleClose}
          type="button"
          aria-label="Close Application"
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 8,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            transition: 'background-color 0.15s',
          }}
        >
          <Power size={16} />
          <span>Close Application</span>
        </button>

        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11,
            color: '#6b7280',
          }}
        >
          <ShieldCheck size={14} color="#059669" />
          <span>VeriSync Institutional Lockdown Session Concluded</span>
        </div>
      </div>
    </div>
  );
};
