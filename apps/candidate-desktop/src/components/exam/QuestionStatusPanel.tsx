import React from 'react';

/**
 * Question Status Panel / Palette
 * Source of truth: docs/design/UI_Sample.jpeg (Screen 4), docs/DECISIONS.md (Decision 1)
 * SRS Requirements:
 * - FR-UI-004: Sequential navigation by default; previous button hidden
 * - FR-UI-005: Read-only question status palette in sequential mode (non-clickable)
 * - Decision 1: Candidates cannot click palette numbers to switch questions in sequential mode
 * - Decision 4: Mark for Review is a local visual aid only
 */

export interface QuestionStatusItem {
  id: string;
  index: number; // 0-based
  displayNumber: number; // 1-based
  section?: 'MCQ' | 'Coding' | 'SQL' | string;
  isAnswered: boolean;
  isCurrent: boolean;
  isMarkedForReview?: boolean;
}

export interface QuestionStatusPanelProps {
  questions: QuestionStatusItem[];
  currentIndex: number;
  isSequentialMode?: boolean; // defaults to true per Decision 1 & FR-UI-005
  onSelectQuestion?: (index: number) => void; // only active when isSequentialMode === false
}

export const QuestionStatusPanel: React.FC<QuestionStatusPanelProps> = ({
  questions,
  currentIndex,
  isSequentialMode = true,
  onSelectQuestion,
}) => {
  // Group questions by section if available
  const sections = React.useMemo(() => {
    const map = new Map<string, QuestionStatusItem[]>();
    for (const q of questions) {
      const sectionName = q.section || 'Questions';
      if (!map.has(sectionName)) {
        map.set(sectionName, []);
      }
      map.get(sectionName)!.push(q);
    }
    return Array.from(map.entries());
  }, [questions]);

  return (
    <aside
      aria-label="Question Status Palette"
      style={{
        width: 240,
        backgroundColor: '#111827',
        borderRight: '1px solid #1f2937',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* Sections & Numbers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map(([sectionName, items]) => (
          <div key={sectionName}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              {sectionName}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}
            >
              {items.map((item) => {
                const isCurrent = item.index === currentIndex;
                const isAnswered = item.isAnswered;
                const isMarked = item.isMarkedForReview;

                // Color tokens matching UI Sample
                let bg = '#1f2937';
                let border = '#374151';
                let text = '#9ca3af';

                if (isCurrent) {
                  bg = '#2563eb';
                  border = '#3b82f6';
                  text = '#ffffff';
                } else if (isAnswered) {
                  bg = 'rgba(16, 185, 129, 0.2)';
                  border = '#10b981';
                  text = '#34d399';
                }

                const canClick = !isSequentialMode && onSelectQuestion;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Question ${item.displayNumber} - ${
                      isCurrent ? 'Current' : isAnswered ? 'Answered' : 'Not Answered'
                    }`}
                    aria-current={isCurrent ? 'step' : undefined}
                    disabled={isSequentialMode}
                    onClick={() => canClick && onSelectQuestion(item.index)}
                    style={{
                      height: 34,
                      borderRadius: 6,
                      backgroundColor: bg,
                      border: `1.5px solid ${border}`,
                      color: text,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: canClick ? 'pointer' : 'default',
                      transition: 'all 0.15s ease-in-out',
                      outline: 'none',
                    }}
                  >
                    <span>{item.displayNumber}</span>

                    {/* Small review ribbon if marked */}
                    {isMarked && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -3,
                          right: -3,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#f59e0b',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status Indicators Legend per UI Sample */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          <span style={{ color: '#cbd5e1' }}>Answered</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#2563eb',
            }}
          />
          <span style={{ color: '#cbd5e1' }}>Current Question</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#374151',
            }}
          />
          <span style={{ color: '#9ca3af' }}>Not Answered</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
            }}
          />
          <span style={{ color: '#fbbf24' }}>Mark for Review</span>
        </div>
      </div>
    </aside>
  );
};
