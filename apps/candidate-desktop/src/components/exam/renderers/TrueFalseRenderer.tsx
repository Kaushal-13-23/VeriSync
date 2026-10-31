import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * True / False Question Renderer (FR-QB-003)
 * Prominent True and False choice pills.
 */

export interface TrueFalseRendererProps {
  questionId: string;
  value: string | boolean | null;
  onChange: (val: string) => void; // 'true' | 'false'
  disabled?: boolean;
}

export const TrueFalseRenderer: React.FC<TrueFalseRendererProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const normalizedValue =
    typeof value === 'boolean'
      ? value
        ? 'true'
        : 'false'
      : value
        ? String(value).toLowerCase()
        : null;

  return (
    <div
      role="radiogroup"
      aria-label="True or False"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
    >
      {/* True Option */}
      <button
        type="button"
        role="radio"
        aria-checked={normalizedValue === 'true'}
        disabled={disabled}
        onClick={() => onChange('true')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '18px 24px',
          borderRadius: 12,
          backgroundColor: normalizedValue === 'true' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
          border: `2px solid ${normalizedValue === 'true' ? '#10b981' : '#334155'}`,
          color: normalizedValue === 'true' ? '#34d399' : '#e2e8f0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: 16,
          fontWeight: 700,
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: normalizedValue === 'true' ? '#10b981' : '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={16} strokeWidth={3} />
        </div>
        <span>TRUE</span>
      </button>

      {/* False Option */}
      <button
        type="button"
        role="radio"
        aria-checked={normalizedValue === 'false'}
        disabled={disabled}
        onClick={() => onChange('false')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '18px 24px',
          borderRadius: 12,
          backgroundColor: normalizedValue === 'false' ? 'rgba(239, 68, 68, 0.15)' : '#1e293b',
          border: `2px solid ${normalizedValue === 'false' ? '#ef4444' : '#334155'}`,
          color: normalizedValue === 'false' ? '#f87171' : '#e2e8f0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: 16,
          fontWeight: 700,
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: normalizedValue === 'false' ? '#ef4444' : '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} strokeWidth={3} />
        </div>
        <span>FALSE</span>
      </button>
    </div>
  );
};
