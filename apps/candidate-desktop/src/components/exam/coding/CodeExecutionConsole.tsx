/**
 * Code Execution Console Component
 * Traceability: FR-CODE-003, FR-CODE-008, FR-CODE-009, FR-CODE-010, Rule 2, TC-10
 * Renders sample test case execution results, compiler messages, runtime errors, and submission limits.
 * STRICT SECURITY: Never displays hidden test case inputs, expected outputs, or internal stack traces.
 */

import React, { useState } from 'react';
import { CodeRunResponse } from '../../../types/codeRunner';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Terminal } from 'lucide-react';

interface CodeExecutionConsoleProps {
  result: CodeRunResponse | null;
  isRunning: boolean;
  onRunCode: () => void;
  remainingSubmissions?: number;
  maxSubmissions?: number;
}

export const CodeExecutionConsole: React.FC<CodeExecutionConsoleProps> = ({
  result,
  isRunning,
  onRunCode,
  remainingSubmissions,
  maxSubmissions,
}) => {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  const isLimited = maxSubmissions !== undefined && maxSubmissions > 0;
  const isExhausted = isLimited && remainingSubmissions !== undefined && remainingSubmissions <= 0;

  return (
    <div
      role="region"
      aria-label="Execution Console"
      style={{
        backgroundColor: '#090d16',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '340px',
        color: '#f8fafc',
      }}
    >
      {/* Console Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            <Terminal size={14} />
            <span>Test Results</span>
          </div>

          {/* Submission Limit Badge (FR-CODE-010) */}
          {isLimited && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: isExhausted
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(14, 165, 233, 0.15)',
                color: isExhausted ? '#ef4444' : '#38bdf8',
                border: isExhausted ? '1px solid #ef4444' : '1px solid #0284c7',
              }}
            >
              Submissions Left: {remainingSubmissions ?? maxSubmissions}/{maxSubmissions}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRunCode}
          disabled={isRunning || isExhausted}
          aria-label="Run Code against Sample Cases"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            backgroundColor: isExhausted ? '#334155' : isRunning ? '#1d4ed8' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            cursor: isRunning || isExhausted ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          {isRunning ? (
            <>
              <Clock size={14} className="animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <span>Run Code</span>
            </>
          )}
        </button>
      </div>

      {/* Results Content */}
      <div style={{ padding: '14px 16px', overflowY: 'auto' }}>
        {!result && !isRunning && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Click &quot;Run Code&quot; to test your solution against visible sample cases.
          </div>
        )}

        {isRunning && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Compiling and executing sample test cases inside secure sandbox...
          </div>
        )}

        {result && !isRunning && (
          <div>
            {/* Status Summary Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor:
                  result.status === 'ACCEPTED'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : result.status === 'WRONG_ANSWER'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${
                  result.status === 'ACCEPTED'
                    ? '#22c55e'
                    : result.status === 'WRONG_ANSWER'
                      ? '#ef4444'
                      : '#f59e0b'
                }`,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {result.status === 'ACCEPTED' ? (
                  <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                ) : result.status === 'WRONG_ANSWER' ? (
                  <XCircle size={18} style={{ color: '#ef4444' }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                )}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color:
                      result.status === 'ACCEPTED'
                        ? '#22c55e'
                        : result.status === 'WRONG_ANSWER'
                          ? '#ef4444'
                          : '#f59e0b',
                  }}
                >
                  {result.status.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  ({result.passedSampleCases}/{result.totalSampleCases} Sample Cases Passed)
                </span>
              </div>

              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Time: {result.executionTimeMs}ms
              </span>
            </div>

            {/* Compiler / Error Output if present */}
            {(result.compilerOutput || result.runtimeError) && (
              <div
                style={{
                  backgroundColor: '#1e1b4b',
                  border: '1px solid #4338ca',
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#c7d2fe',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
                  {result.runtimeError ? 'Runtime Exception' : 'Compiler Output'}:
                </div>
                {result.compilerOutput || result.runtimeError}
              </div>
            )}

            {/* Sample Case Tabs & Details (FR-CODE-003, Rule 2) */}
            {result.sampleResults && result.sampleResults.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {result.sampleResults.map((sc, idx) => (
                    <button
                      key={sc.testCaseId}
                      type="button"
                      onClick={() => setSelectedCaseIdx(idx)}
                      aria-pressed={selectedCaseIdx === idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor:
                          selectedCaseIdx === idx ? (sc.passed ? '#166534' : '#991b1b') : '#1e293b',
                        color: sc.passed ? '#86efac' : '#fca5a5',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {sc.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>Case {idx + 1}</span>
                    </button>
                  ))}
                </div>

                {/* Active Case Inspection */}
                {result.sampleResults[selectedCaseIdx] && (
                  <div
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid #1f2937',
                      borderRadius: 6,
                      padding: '10px 14px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Input: </span>
                      <span style={{ color: '#f1f5f9' }}>
                        {result.sampleResults[selectedCaseIdx].input}
                      </span>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Expected Output: </span>
                      <span style={{ color: '#34d399' }}>
                        {result.sampleResults[selectedCaseIdx].expectedOutput}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Your Output: </span>
                      <span
                        style={{
                          color: result.sampleResults[selectedCaseIdx].passed
                            ? '#34d399'
                            : '#f87171',
                          fontWeight: 600,
                        }}
                      >
                        {result.sampleResults[selectedCaseIdx].actualOutput ?? '(none)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
