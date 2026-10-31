import React from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Power,
  Clock,
  HelpCircle,
  User,
  Award,
  Lock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { MockAssessmentSession, MockUser } from '../services/mockApi';
import { CandidateFinalSubmitResponse } from '../types/assessment';

/**
 * Submission Confirmation & Results Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 5: Submission Screen)
 * SRS Requirements:
 * - FR-UI-007 & FR-UI-009: Final submission confirmation screen displaying summary and completion timestamp
 * - FR-ASMT-002: Enforce result-visibility policy (IMMEDIATE vs ADMIN_RELEASE / SCHEDULED)
 * - FR-SCORE-008: Handle provisional results during pending subjective evaluation
 * - FR-ANS-008: Assessment completion marking with prevention of further changes
 * - Non-Negotiable Rule 9: Timestamps formatted in UTC ISO-8601
 */

interface SubmittedScreenProps {
  user: MockUser;
  session: MockAssessmentSession;
  finalResult?: CandidateFinalSubmitResponse | null;
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
  const testTitle =
    finalResult?.assessmentTitle || session.title || 'Frontend Developer Assessment';
  const totalQuestions = finalResult?.totalQuestions ?? session.totalQuestions ?? 6;
  const answeredCount = finalResult?.answeredCount ?? session.answeredAttemptIds?.size ?? 0;
  const submittedTimestamp = finalResult?.submittedAt
    ? new Date(finalResult.submittedAt).toUTCString()
    : new Date().toUTCString();

  // FR-ASMT-002: Result Visibility Policy Check
  const resultVisibility =
    finalResult?.resultVisibility || session.resultVisibility || 'ADMIN_RELEASE';
  const hasImmediateResults = resultVisibility === 'IMMEDIATE' && Boolean(finalResult?.result);
  const result = finalResult?.result;

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
          maxWidth: 580,
          backgroundColor: '#111827',
          borderRadius: 16,
          border: '1px solid #1f2937',
          padding: 36,
          textAlign: 'center',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <CheckCircle2 size={44} color="#10b981" />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc' }}>
          Test Submitted Successfully!
        </h2>
        <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#9ca3af', lineHeight: 1.5 }}>
          Your responses have been durably committed to the authoritative system of record.
          {hasImmediateResults
            ? ' Your preliminary assessment score and breakdown are available below.'
            : ' Per institutional policy, results will be released after evaluation.'}
        </p>

        {/* FR-SCORE-008 & FR-ASMT-002: Candidate Results Breakdown (Only when allowed by policy) */}
        {hasImmediateResults && result ? (
          <div
            data-testid="candidate-results-card"
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 12,
              border: '1px solid #334155',
              padding: '20px 24px',
              textAlign: 'left',
              marginBottom: 24,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <TrendingUp size={18} color="#60a5fa" />
                Assessment Results
              </span>
              {result.resultStatus === 'PROVISIONAL' ? (
                <span
                  data-testid="provisional-badge"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <AlertTriangle size={12} />
                  Provisional
                </span>
              ) : (
                <span
                  data-testid="outcome-badge"
                  style={{
                    backgroundColor: result.passed
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    color: result.passed ? '#34d399' : '#f87171',
                    border: `1px solid ${result.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 9999,
                  }}
                >
                  {result.passed ? 'PASSED' : 'BENCHMARK NOT MET'}
                </span>
              )}
            </div>

            {/* Score & Percentage Overview */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>
                {result.totalScore}
                <span style={{ fontSize: 16, fontWeight: 500, color: '#94a3b8' }}>
                  {' '}
                  / {result.maximumScore} pts
                </span>
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: result.passed ? '#34d399' : '#60a5fa',
                }}
              >
                ({result.percentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: 8,
                backgroundColor: '#0f172a',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, result.percentage))}%`,
                  height: '100%',
                  backgroundColor: result.passed ? '#10b981' : '#f59e0b',
                  borderRadius: 4,
                  transition: 'width 0.4s ease-out',
                }}
              />
            </div>

            {/* Passing Benchmark & Provisional Notice */}
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span>Passing Benchmark: {result.benchmarkScore ?? 60}%</span>
              <span>Outcome: {result.passed ? 'Qualified' : 'Unqualified'}</span>
            </div>

            {result.resultStatus === 'PROVISIONAL' && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: 6,
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: 12,
                  color: '#fef3c7',
                  lineHeight: 1.4,
                }}
              >
                <strong>Provisional Notice (FR-SCORE-008):</strong> Subjective questions or
                programming test cases are undergoing manual review. Final score will be updated
                upon evaluator completion.
              </div>
            )}
          </div>
        ) : (
          /* Result Visibility Restricted Policy Notice */
          <div
            data-testid="result-restricted-policy"
            style={{
              backgroundColor: '#172554',
              borderRadius: 10,
              border: '1px solid #1e40af',
              padding: '14px 18px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <Lock size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', marginBottom: 4 }}>
                Result Visibility Policy (FR-ASMT-002)
              </div>
              <div style={{ fontSize: 12, color: '#bfdbfe', lineHeight: 1.4 }}>
                In accordance with institutional assessment policy, individual scores are withheld
                for administrative review and will be released after cohort evaluation concludes.
              </div>
            </div>
          </div>
        )}

        {/* Summary Details Card per UI Sample */}
        <div
          data-testid="submission-summary-card"
          style={{
            backgroundColor: '#1f2937',
            borderRadius: 10,
            border: '1px solid #374151',
            padding: '18px 22px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 24,
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
            <span
              style={{ fontWeight: 600, color: '#34d399', fontSize: 12, fontFamily: 'monospace' }}
            >
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
            marginTop: 18,
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
