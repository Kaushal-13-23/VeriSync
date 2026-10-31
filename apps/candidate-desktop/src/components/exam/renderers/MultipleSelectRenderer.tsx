import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { OptionItem } from './SingleChoiceRenderer';

/**
 * Multiple Select Question Renderer (FR-QB-003)
 * Allows choosing one or more options with clean checkbox states.
 */

export interface MultipleSelectRendererProps {
  questionId: string;
  options: OptionItem[];
  value: string[]; // array of selected option IDs
  onChange: (selectedOptionIds: string[]) => void;
  disabled?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const MultipleSelectRenderer: React.FC<MultipleSelectRendererProps> = ({
  options,
  value = [],
  onChange,
  disabled = false,
}) => {
  const toggleOption = (id: string) => {
    if (disabled) return;
    const isSelected = value.includes(id);
    if (isSelected) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div
      role="group"
      aria-label="Multiple Select Options"
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
        (Select all options that apply)
      </div>

      {options.map((opt, idx) => {
        const isSelected = value.includes(opt.id);
        const letter = OPTION_LETTERS[idx] || `${idx + 1}`;

        return (
          <div
            key={opt.id}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onClick={() => toggleOption(opt.id)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
                e.preventDefault();
                toggleOption(opt.id);
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
                borderRadius: 6,
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

            {/* Checkbox Indicator */}
            <div style={{ flexShrink: 0 }}>
              {isSelected ? (
                <CheckSquare size={20} color="#3b82f6" />
              ) : (
                <Square size={20} color="#475569" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
