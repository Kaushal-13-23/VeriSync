/**
 * Problem Panel Component for Coding Assessment
 * Traceability: FR-CODE-001..003, UC-11
 * Displays Problem Statement, Input/Output Specifications, Sample Cases, and Explanations.
 */

import React, { useState } from 'react';
import { CodingQuestionDetails } from '../../../types/codeRunner';
import { BookOpen, Code, Info, CheckCircle2 } from 'lucide-react';

interface ProblemPanelProps {
  details: CodingQuestionDetails;
  title?: string;
  maxMarks?: number;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export const ProblemPanel: React.FC<ProblemPanelProps> = ({
  details,
  title = 'Coding Challenge',
  maxMarks = 20,
  timeLimitMs = 3000,
  memoryLimitMb = 256,
}) => {
  const [activeTab, setActiveTab] = useState<'problem' | 'samples'>('problem');

  return (
    <div
      role="region"
      aria-label="Problem Description Panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Header with Title, Marks, and Badges */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f8fafc' }}>{title}</h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
            <span>Max Score: <strong style={{ color: '#38bdf8' }}>{maxMarks} pts</strong></span>
            <span>Time: <strong>{timeLimitMs / 1000}s</strong></span>
            <span>Memory: <strong>{memoryLimitMb}MB</strong></span>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', backgroundColor: '#0f172a', borderRadius: 6, padding: 3, gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab('problem')}
            aria-pressed={activeTab === 'problem'}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'problem' ? '#2563eb' : 'transparent',
              color: activeTab === 'problem' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <BookOpen size={13} />
            <span>Problem</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            aria-pressed={activeTab === 'samples'}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'samples' ? '#2563eb' : 'transparent',
              color: activeTab === 'samples' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Code size={13} />
            <span>Examples ({details.sampleCases.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'problem' && (
          <div>
            {/* Statement */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>
                Description
              </h3>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {details.statement}
              </div>
            </div>

            {/* Input Format */}
            {details.inputFormat && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 6 }}>
                  Input Format
                </h4>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                  {details.inputFormat}
                </div>
              </div>
            )}

            {/* Output Format */}
            {details.outputFormat && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 6 }}>
                  Output Format
                </h4>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                  {details.outputFormat}
                </div>
              </div>
            )}

            {/* Constraints */}
            {details.constraints && details.constraints.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 6 }}>
                  Constraints
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                  {details.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Examples Tab */}
        {(activeTab === 'samples' || activeTab === 'problem') && (
          <div style={{ marginTop: activeTab === 'problem' ? 24 : 0 }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 12 }}>
              Sample Test Cases
            </h3>

            {details.sampleCases.map((sample, idx) => (
              <div
                key={sample.id || idx}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: '14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>
                  <CheckCircle2 size={15} />
                  <span>Example {idx + 1}</span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 3 }}>
                    Input
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '8px 12px',
                      backgroundColor: '#030712',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: '#f1f5f9',
                      overflowX: 'auto',
                    }}
                  >
                    {sample.input}
                  </pre>
                </div>

                <div style={{ marginBottom: sample.explanation ? 8 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 3 }}>
                    Expected Output
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '8px 12px',
                      backgroundColor: '#030712',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: '#34d399',
                      overflowX: 'auto',
                    }}
                  >
                    {sample.expectedOutput}
                  </pre>
                </div>

                {sample.explanation && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <Info size={13} style={{ marginTop: 2, flexShrink: 0, color: '#38bdf8' }} />
                    <span>Explanation: {sample.explanation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
