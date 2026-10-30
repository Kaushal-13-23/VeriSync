/**
 * VeriSync Result Detail Review Drawer
 * Displays per-question score breakdown, candidate response vs rubric, marks, provisional/final badge, and correction history.
 * Traceability: FR-SCORE-001..008, FR-SCORE-010, FR-ADMIN-003, Rule 7, Rule 9
 */

import React from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  FileCode,
  Database,
  HelpCircle,
  FileText,
  User,
  Clock,
  Award,
} from 'lucide-react';
import { AssessmentResultRecord } from '../../types/api';

interface ResultDetailDrawerProps {
  result: AssessmentResultRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCorrection?: (result: AssessmentResultRecord) => void;
  isSuperAdmin?: boolean;
}

export const ResultDetailDrawer: React.FC<ResultDetailDrawerProps> = ({
  result,
  isOpen,
  onClose,
  onOpenCorrection,
  isSuperAdmin = true,
}) => {
  if (!isOpen || !result) return null;

  const isPass = result.passFailStatus === 'PASS';
  const isProvisional = result.status === 'PROVISIONAL';

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CODING':
        return <FileCode className="w-4 h-4 text-purple-600" />;
      case 'SQL':
        return <Database className="w-4 h-4 text-emerald-600" />;
      case 'DESCRIPTIVE':
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/75 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                {result.candidateIdentifier}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isPass
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {isPass ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {isPass ? 'PASSED' : 'FAILED'}
              </span>

              {isProvisional && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  PROVISIONAL
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900">{result.candidateName}</h2>
            <p className="text-xs text-slate-500 font-medium">
              {result.assessmentTitle} • Completed on{' '}
              {new Date(result.completedOn).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close review drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Attempt Summary Cards */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Award className="w-3.5 h-3.5 text-sky-500" />
              <span>Score Achieved</span>
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">{result.scorePercentage}%</div>
            <div className="text-[11px] text-slate-500">
              {result.totalScore} / {result.maxScore} points (Pass: {result.passingScorePercentage}
              %)
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Time Taken</span>
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">{result.timeTakenMinutes}m</div>
            <div className="text-[11px] text-slate-500">Sequential exam session</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <User className="w-3.5 h-3.5 text-purple-500" />
              <span>Candidate Status</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 truncate">
              {result.candidateEmail}
            </div>
            <div className="text-[11px] text-slate-500">ID: {result.candidateIdentifier}</div>
          </div>
        </div>

        {/* Content Body - Questions Review & Score Correction History */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Question Breakdown Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
                Question-by-Question Score Breakdown
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {result.questions.length} questions attempted
              </span>
            </div>

            <div className="space-y-3">
              {result.questions.map((q, idx) => {
                const isFullMarks = q.marksAwarded === q.maxMarks;
                const isZero = q.marksAwarded === 0;

                return (
                  <div
                    key={q.questionId}
                    className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getTypeIcon(q.questionType)}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {q.questionType}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800">{q.questionTitle}</h4>
                      </div>

                      {/* Marks Chip */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                            isFullMarks
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isZero
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {q.marksAwarded} / {q.maxMarks} pts
                        </span>
                      </div>
                    </div>

                    {/* Candidate Answer Box */}
                    <div className="text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 space-y-1.5">
                      <div className="text-slate-400 font-medium">Candidate Submission:</div>
                      {typeof q.candidateAnswer === 'string' ? (
                        <div className="font-mono text-slate-800 whitespace-pre-wrap break-words text-[11px] bg-white p-2.5 rounded-md border border-slate-200">
                          {q.candidateAnswer}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {q.candidateAnswer.map((ans, aIdx) => (
                            <span
                              key={aIdx}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-medium"
                            >
                              {ans}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expected / Correct Reference */}
                      {q.correctAnswerText && (
                        <div className="text-slate-500 pt-1 text-[11px]">
                          <span className="font-semibold text-slate-700">Answer Key: </span>
                          <span className="text-emerald-700 font-medium">
                            {q.correctAnswerText}
                          </span>
                        </div>
                      )}

                      {/* Coding / SQL Test Case Results */}
                      {q.totalTestCases !== undefined && (
                        <div className="text-slate-600 text-[11px] pt-1 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">Test Cases:</span>
                          <span
                            className={`font-semibold ${
                              q.testCasesPassed === q.totalTestCases
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {q.testCasesPassed} / {q.totalTestCases} passed
                          </span>
                        </div>
                      )}

                      {/* Evaluator Comments */}
                      {q.evaluatorComments && (
                        <div className="bg-sky-50/60 p-2.5 rounded-md border border-sky-100 text-sky-900 text-[11px] mt-2 space-y-0.5">
                          <div className="font-semibold flex items-center justify-between text-sky-800">
                            <span>
                              Evaluator Comments ({q.evaluatorName || 'Technical Evaluator'})
                            </span>
                            {q.evaluatedAt && (
                              <span className="text-[10px] text-sky-600 font-normal">
                                {new Date(q.evaluatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sky-800/90">{q.evaluatorComments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Correction History (FR-SCORE-010, Rule 7) */}
          {result.corrections && result.corrections.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Audited Score Correction History (FR-SCORE-010, Rule 7)</span>
              </div>

              <div className="space-y-2">
                {result.corrections.map((corr) => (
                  <div
                    key={corr.id}
                    className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-900">{corr.adminName}</span>
                      <span className="text-[11px] text-indigo-600 font-mono">
                        {new Date(corr.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <span>Score adjustment:</span>
                      <span className="font-mono text-rose-600 line-through">
                        {corr.originalScore} pts
                      </span>
                      <span>→</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {corr.revisedScore} pts
                      </span>
                      {corr.questionTitle && (
                        <span className="text-slate-500 font-medium truncate">
                          ({corr.questionTitle})
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-2 rounded border border-indigo-100 text-slate-800 text-[11px]">
                      <span className="font-semibold text-indigo-800">
                        Mandatory Justification:{' '}
                      </span>
                      {corr.reason}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Correlation ID: {corr.correlationId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Session ID: <span className="font-mono">{result.sessionId}</span>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && onOpenCorrection && (
              <button
                type="button"
                onClick={() => onOpenCorrection(result)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Correct Score (Audited)
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
