/**
 * SQL Execution Console & Results Grid Component
 * Traceability: FR-SQL-003..005, UC-11
 * Features: Tabular Results Grid, Row Count, Execution Duration, and Error Display.
 */

import React from 'react';
import { SqlRunResponse } from '../../../types/codeRunner';
import { Play, Clock, AlertOctagon, Table2, CheckCircle2 } from 'lucide-react';

interface SqlExecutionConsoleProps {
  result: SqlRunResponse | null;
  isRunning: boolean;
  onRunQuery: () => void;
  remainingSubmissions?: number;
  maxSubmissions?: number;
}

export const SqlExecutionConsole: React.FC<SqlExecutionConsoleProps> = ({
  result,
  isRunning,
  onRunQuery,
  remainingSubmissions,
  maxSubmissions,
}) => {
  const isLimited = maxSubmissions !== undefined && maxSubmissions > 0;
  const isExhausted = isLimited && remainingSubmissions !== undefined && remainingSubmissions <= 0;

  return (
    <div
      role="region"
      aria-label="SQL Results Grid Console"
      style={{
        backgroundColor: '#090d16',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '340px',
        color: '#f8fafc',
      }}
    >
      {/* Control Header */}
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
            <Table2 size={14} />
            <span>Query Results Grid</span>
          </div>

          {result && !result.error && (
            <span
              style={{
                fontSize: 12,
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} />
              <span>
                {result.rowCount} rows returned ({result.executionTimeMs}ms)
              </span>
            </span>
          )}

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
              Executions Left: {remainingSubmissions ?? maxSubmissions}/{maxSubmissions}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRunQuery}
          disabled={isRunning || isExhausted}
          aria-label="Execute SQL Query"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            backgroundColor: isExhausted ? '#334155' : isRunning ? '#0284c7' : '#0ea5e9',
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
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Play size={13} />
              <span>Run Query</span>
            </>
          )}
        </button>
      </div>

      {/* Grid Content Area */}
      <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
        {!result && !isRunning && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Click &quot;Run Query&quot; to execute your SQL against the isolated database sandbox.
          </div>
        )}

        {isRunning && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Executing query in ephemeral SQLite sandbox...
          </div>
        )}

        {/* Error Display */}
        {result?.error && !isRunning && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              borderRadius: 6,
              color: '#fca5a5',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          >
            <AlertOctagon size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Query Execution Error:</div>
              <div>{result.error}</div>
            </div>
          </div>
        )}

        {/* Tabular Results Grid */}
        {result && !result.error && !isRunning && (
          <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
            {result.rows && result.rows.length > 0 ? (
              <table
                role="table"
                aria-label="SQL Output Table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '2px solid #334155' }}>
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '8px 12px',
                          color: '#38bdf8',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        backgroundColor: rowIdx % 2 === 0 ? '#0f172a' : '#111827',
                        borderBottom: '1px solid #1e293b',
                      }}
                    >
                      {result.columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '7px 12px',
                            color: '#e2e8f0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row[col] !== null && row[col] !== undefined ? (
                            String(row[col])
                          ) : (
                            <em style={{ color: '#64748b' }}>NULL</em>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Query executed successfully. 0 rows returned.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
