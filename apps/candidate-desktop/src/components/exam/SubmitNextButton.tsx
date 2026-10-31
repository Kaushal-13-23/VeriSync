import React from 'react';
import { ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Submit and Next Action Button with In-Flight & Retry States
 * Source of truth: docs/SRS/srs.md (FR-UI-006, FR-ANS-009, Rule 3)
 *
 * Requirements:
 * - Double-click and multiple-submission protection (disabled while in-flight)
 * - Clear retry state upon network/server interruption with preserved Idempotency-Key
 * - Distinct styling across idle, in-flight, retry, and success states
 */

export type SubmissionButtonState = 'idle' | 'in-flight' | 'retry' | 'success';

export interface SubmitNextButtonProps {
  state: SubmissionButtonState;
  isLastQuestion?: boolean;
  errorMessage?: string | null;
  onSubmit: () => void;
  onRetry?: () => void;
  disabled?: boolean;
}

export const SubmitNextButton: React.FC<SubmitNextButtonProps> = ({
  state,
  isLastQuestion = false,
  errorMessage,
  onSubmit,
  onRetry,
  disabled = false,
}) => {
  const isInFlight = state === 'in-flight';
  const isRetry = state === 'retry';
  const isSuccess = state === 'success';

  const handleClick = () => {
    if (disabled || isInFlight) return;
    if (isRetry && onRetry) {
      onRetry();
    } else {
      onSubmit();
    }
  };

  // Button background styling based on state
  const getBackgroundColor = () => {
    if (disabled) return '#374151';
    if (isSuccess) return '#059669';
    if (isRetry) return '#dc2626';
    if (isInFlight) return '#1d4ed8';
    return '#2563eb';
  };

  const getButtonText = () => {
    if (isInFlight) return 'Submitting...';
    if (isSuccess) return 'Submitted!';
    if (isRetry) return 'Retry Submission';
    return isLastQuestion ? 'Submit Assessment' : 'Submit & Next';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      {/* Error Message if in Retry State */}
      {isRetry && errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#f87171',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMessage} (Idempotency Key preserved)</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isInFlight || isSuccess}
        aria-busy={isInFlight}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: getBackgroundColor(),
          color: '#ffffff',
          border: 'none',
          fontSize: 14,
          fontWeight: 600,
          cursor: disabled || isInFlight || isSuccess ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: !disabled && !isInFlight ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
          transition: 'all 0.15s ease-in-out',
          minWidth: 160,
        }}
      >
        {isInFlight && <RefreshCw size={16} className="animate-spin" />}
        {isRetry && <RefreshCw size={16} />}
        {isSuccess && <CheckCircle2 size={16} />}

        <span>{getButtonText()}</span>

        {!isInFlight && !isRetry && !isSuccess && <ArrowRight size={16} />}
      </button>
    </div>
  );
};
