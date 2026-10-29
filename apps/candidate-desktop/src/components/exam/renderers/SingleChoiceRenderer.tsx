import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

/**
 * Single Choice Question Renderer (FR-QB-003)
 * Provides single-select radio behavior with accessible keyboard navigation.
 */

export interface OptionItem {
  id: string;
  text: string;
}

export interface SingleChoiceRendererProps {
  questionId: string;
  options: OptionItem[];
  value: string | null;
  onChange: (selectedOptionId: string) => void;
  disabled?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const SingleChoiceRenderer: React.FC<SingleChoiceRendererProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="Single Choice Options"
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {options.map((opt, idx) => {
        const isSelected = value === opt.id;
        const letter = OPTION_LETTERS[idx] || `${idx + 1}`;

        return (
          <div
            key={opt.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onChange(opt.id)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                onChange(opt.id);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 10,
              backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.12)' : '#1e293b',
              border: `1.5px solid ${isSelected ? '#3b82f6' : '#334155'}`,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {/* Letter Badge */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: isSelected ? '#2563eb' : '#0f172a',
                color: isSelected ? '#ffffff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                border: `1px solid ${isSelected ? '#3b82f6' : '#475569'}`,
                flexShrink: 0,
              }}
            >
              {letter}
            </div>

            {/* Option Text */}
            <span
              style={{
                fontSize: 14,
                color: isSelected ? '#f8fafc' : '#e2e8f0',
                lineHeight: 1.5,
                flex: 1,
                fontWeight: isSelected ? 500 : 400,
              }}
            >
              {opt.text}
            </span>

            {/* Check/Radio Indicator */}
            <div style={{ flexShrink: 0 }}>
              {isSelected ? (
                <CheckCircle2 size={20} color="#3b82f6" />
              ) : (
                <Circle size={20} color="#475569" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

