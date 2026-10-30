/**
 * Coding Question Renderer with Split Screen Layout
 * Traceability: FR-CODE-001..010, FR-ANS-005, UC-11
 * Matches UI Sample Screen 4 Exam Interface.
 */

import React, { useState } from 'react';
import { ProblemPanel } from '../coding/ProblemPanel';
import { MonacoCodeEditor } from '../coding/MonacoCodeEditor';
import { CodeExecutionConsole } from '../coding/CodeExecutionConsole';
import { CodingQuestionDetails, CodeRunResponse, SupportedLanguage } from '../../../types/codeRunner';
import { codeRunnerService } from '../../../services/codeRunnerService';

interface CodingRendererProps {
  questionId: string;
  details: CodingQuestionDetails;
  value: string;
  onChange: (code: string) => void;
  draftSavedAt?: string | null;
  isSavingDraft?: boolean;
  fontScale?: 'normal' | 'large' | 'xlarge';
}

export const CodingRenderer: React.FC<CodingRendererProps> = ({
  questionId,
  details,
  value,
  onChange,
  draftSavedAt,
  isSavingDraft = false,
  fontScale = 'normal',
}) => {
  const [language, setLanguage] = useState<SupportedLanguage>(details.defaultLanguage || 'python');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<CodeRunResponse | null>(null);
  const [submissionsUsed, setSubmissionsUsed] = useState(codeRunnerService.getSubmissionsUsed(questionId));

  const maxSubs = details.maxSubmissions;
  const remainingSubmissions = maxSubs !== undefined ? Math.max(0, maxSubs - submissionsUsed) : undefined;

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      const response = await codeRunnerService.runCode({
        sourceCode: value,
        language,
        sampleCases: details.sampleCases,
        questionAttemptId: questionId,
        timeLimitMs: details.timeLimitMs,
        memoryLimitMb: details.memoryLimitMb,
        maxSubmissions: maxSubs,
      });

      setRunResult(response);
      const used = codeRunnerService.incrementSubmissionsUsed(questionId);
      setSubmissionsUsed(used);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      data-testid="coding-renderer"
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
      {/* Left Pane: Problem Description & Sample Cases */}
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <ProblemPanel
          details={details}
          title="Coding Challenge"
          timeLimitMs={details.timeLimitMs}
          memoryLimitMb={details.memoryLimitMb}
        />
      </div>

      {/* Right Pane: Monaco Code Editor + Results Console */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#18181b',
        }}
      >
        {/* Editor Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MonacoCodeEditor
            value={value}
            onChange={onChange}
            language={language}
            onLanguageChange={setLanguage}
            allowedLanguages={details.allowedLanguages}
            fontScale={fontScale}
            starterTemplate={details.starterTemplates?.[language]}
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
              <span style={{ color: '#38bdf8' }}>Autosaving draft response...</span>
            ) : draftSavedAt ? (
              <span style={{ color: '#4ade80' }}>
                Draft autosaved at {new Date(draftSavedAt).toLocaleTimeString()} UTC (FR-ANS-005)
              </span>
            ) : (
              <span>Draft autosaves every 10s without extending deadline</span>
            )}
          </div>
          <div>Language: <strong style={{ color: '#cbd5e1' }}>{language.toUpperCase()}</strong></div>
        </div>

        {/* Bottom Console */}
        <CodeExecutionConsole
          result={runResult}
          isRunning={isRunning}
          onRunCode={handleRunCode}
          remainingSubmissions={remainingSubmissions}
          maxSubmissions={maxSubs}
        />
      </div>
    </div>
  );
};
