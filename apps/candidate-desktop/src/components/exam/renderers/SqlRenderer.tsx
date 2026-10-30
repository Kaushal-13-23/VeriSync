/**
 * SQL Question Renderer with Split Screen Layout
 * Traceability: FR-SQL-001..005, FR-ANS-005, UC-11
 * Matches UI Sample Screen 4 Exam Interface.
 */

import React, { useState } from 'react';
import { SqlProblemPanel } from '../sql/SqlProblemPanel';
import { SqlExecutionConsole } from '../sql/SqlExecutionConsole';
import { SqlQuestionDetails, SqlRunResponse } from '../../../types/codeRunner';
import { codeRunnerService } from '../../../services/codeRunnerService';
import { Database, RotateCcw } from 'lucide-react';

interface SqlRendererProps {
  questionId: string;
  details: SqlQuestionDetails;
  value: string;
  onChange: (sql: string) => void;
  draftSavedAt?: string | null;
  isSavingDraft?: boolean;
  fontScale?: 'normal' | 'large' | 'xlarge';
}

const DEFAULT_SQL_TEMPLATE = `-- SQLite Query Solution\nSELECT \n    *\nFROM \n    employees\nWHERE \n    department = 'Engineering';\n`;

export const SqlRenderer: React.FC<SqlRendererProps> = ({
  questionId,
  details,
  value,
  onChange,
  draftSavedAt,
  isSavingDraft = false,
  fontScale = 'normal',
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<SqlRunResponse | null>(null);
  const [submissionsUsed, setSubmissionsUsed] = useState(codeRunnerService.getSubmissionsUsed(questionId));

  const maxSubs = details.maxSubmissions;
  const remainingSubmissions = maxSubs !== undefined ? Math.max(0, maxSubs - submissionsUsed) : undefined;
  const fontSize = fontScale === 'xlarge' ? 18 : fontScale === 'large' ? 16 : 14;

  const handleRunQuery = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      const response = await codeRunnerService.runSql({
        candidateQuery: value,
        schemaDdl: details.schemaDdl,
        seedDataSql: details.seedDataSql,
        sampleExpectedRows: details.sampleExpectedRows,
        questionAttemptId: questionId,
        comparisonMode: details.comparisonMode,
        maxSubmissions: maxSubs,
      });

      setRunResult(response);
      const used = codeRunnerService.incrementSubmissionsUsed(questionId);
      setSubmissionsUsed(used);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_SQL_TEMPLATE);
  };

  return (
    <div
      data-testid="sql-renderer"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.25fr)',
        gap: '0px',
        height: '620px',
        backgroundColor: '#0f172a',
        borderRadius: 8,
        border: '1px solid #1e293b',
        overflow: 'hidden',
      }}
    >
      {/* Left Pane: Instructions & Schema DDL */}
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <SqlProblemPanel details={details} title="SQL Query Challenge" />
      </div>

      {/* Right Pane: SQL Editor + Results Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#18181b',
        }}
      >
        {/* Editor Control Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: '#18181b',
            borderBottom: '1px solid #27272a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>
            <Database size={15} />
            <span>SQL Query Editor (SQLite 3)</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            title="Reset query to default template"
            aria-label="Reset SQL Template"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: '#a1a1aa',
              backgroundColor: 'transparent',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* SQL Editor Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <textarea
            aria-label="SQL Editor Input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize,
              lineHeight: 1.6,
              padding: '16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              tabSize: 4,
              whiteSpace: 'pre',
            }}
            placeholder="Write your SQL SELECT query here..."
          />
        </div>

        {/* Draft Autosave Indicator (FR-ANS-005) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 16px',
            backgroundColor: '#18181b',
            borderTop: '1px solid #27272a',
            fontSize: 11,
            color: '#71717a',
          }}
        >
          <div>
            {isSavingDraft ? (
              <span style={{ color: '#38bdf8' }}>Autosaving draft query...</span>
            ) : draftSavedAt ? (
              <span style={{ color: '#4ade80' }}>
                Draft autosaved at {new Date(draftSavedAt).toLocaleTimeString()} UTC (FR-ANS-005)
              </span>
            ) : (
              <span>Draft autosaves every 10s without extending deadline</span>
            )}
          </div>
          <div>Dialect: <strong style={{ color: '#cbd5e1' }}>SQLITE</strong></div>
        </div>

        {/* SQL Results Grid & Execution Console */}
        <SqlExecutionConsole
          result={runResult}
          isRunning={isRunning}
          onRunQuery={handleRunQuery}
          remainingSubmissions={remainingSubmissions}
          maxSubmissions={maxSubs}
        />
      </div>
    </div>
  );
};
