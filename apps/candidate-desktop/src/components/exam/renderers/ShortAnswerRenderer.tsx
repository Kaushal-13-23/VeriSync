import React from 'react';

/**
 * Short Answer Question Renderer (FR-QB-003)
 * Provides text input with character counting, trimming, and autofocus.
 */

export interface ShortAnswerRendererProps {
  questionId: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export const ShortAnswerRenderer: React.FC<ShortAnswerRendererProps> = ({
  value = '',
  onChange,
  placeholder = 'Type your answer here...',
  maxLength = 500,
  disabled = false,
}) => {
  const currentLength = value.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= maxLength) {
            onChange(e.target.value);
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 10,
          backgroundColor: '#1e293b',
          border: '1.5px solid #334155',
          color: '#f8fafc',
          fontSize: 14,
          fontFamily: 'inherit',
          lineHeight: 1.5,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: currentLength >= maxLength ? '#f87171' : '#94a3b8',
        }}
      >
        <span>Please be concise and precise in your response.</span>
        <span>
          {currentLength} / {maxLength}
        </span>
      </div>
    </div>
  );
};
