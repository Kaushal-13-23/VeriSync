/**
 * VeriSync Score Correction Modal
 * Super Admin audited score adjustment workflow with mandatory justification reason.
 * Traceability: BR-012, FR-SCORE-010, Rule 7, Rule 9, UC-15
 */

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { AssessmentResultRecord, ScoreCorrectionPayload } from '../../types/api';

interface ScoreCorrectionModalProps {
  result: AssessmentResultRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitCorrection: (payload: ScoreCorrectionPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const ScoreCorrectionModal: React.FC<ScoreCorrectionModalProps> = ({
  result,
  isOpen,
  onClose,
  onSubmitCorrection,
  isSubmitting = false,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('overall'); // 'overall' or questionId
  const [revisedScore, setRevisedScore] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form when opened or result changes
  React.useEffect(() => {
    if (result) {
      setSelectedTarget('overall');
      setRevisedScore(result.totalScore);
      setReason('');
      setConfirmed(false);
      setValidationError(null);
    }
  }, [result, isOpen]);

  if (!isOpen || !result) return null;

  const currentQuestion =
    selectedTarget !== 'overall'
      ? result.questions.find((q) => q.questionId === selectedTarget)
      : null;

  const originalScore = currentQuestion ? currentQuestion.marksAwarded : result.totalScore;
  const maxScore = currentQuestion ? currentQuestion.maxMarks : result.maxScore;

  const handleTargetChange = (target: string) => {
    setSelectedTarget(target);
    setValidationError(null);
    if (target === 'overall') {
      setRevisedScore(result.totalScore);
    } else {
      const q = result.questions.find((item) => item.questionId === target);
      setRevisedScore(q ? q.marksAwarded : 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Rule 7 & BR-012: Mandatory reason validation
    if (!reason || reason.trim().length === 0) {
      setValidationError(
        'Mandatory justification reason is required for administrative score correction (BR-012, Rule 7, UC-15).',
      );
      return;
    }

    if (revisedScore < 0 || revisedScore > maxScore) {
      setValidationError(`Revised score must be between 0 and maximum marks (${maxScore} pts).`);
      return;
    }

    if (!confirmed) {
      setValidationError('Please check the confirmation box before submitting.');
      return;
    }

    try {
      await onSubmitCorrection({
        resultId: result.id,
        questionId: selectedTarget === 'overall' ? null : selectedTarget,
        newScore: revisedScore,
        reason: reason.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit score correction.';
      setValidationError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Score Correction Workflow</h3>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory justification logged to immutable audit trail (Rule 7, BR-012)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close correction modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Candidate & Assessment Context */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-800">{result.candidateName}</span>
              <span className="text-slate-400 font-mono ml-2">({result.candidateIdentifier})</span>
              <div className="text-slate-500 text-[11px] mt-0.5">{result.assessmentTitle}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400">Current Total:</span>
              <div className="font-bold text-slate-900 text-sm">
                {result.scorePercentage}% ({result.totalScore}/{result.maxScore} pts)
              </div>
            </div>
          </div>

          {/* Target Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Correction Target
            </label>
            <select
              aria-label="Correction Target"
              value={selectedTarget}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            >
              <option value="overall">
                Overall Total Score (Currently: {result.totalScore} / {result.maxScore} pts)
              </option>
              {result.questions.map((q, idx) => (
                <option key={q.questionId} value={q.questionId}>
                  Q{idx + 1}: {q.questionTitle} ({q.marksAwarded} / {q.maxMarks} pts - {q.questionType})
                </option>
              ))}
            </select>
          </div>

          {/* Original vs Revised Score Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-medium text-slate-400">Original Marks</span>
              <div className="text-lg font-bold text-slate-800 mt-1">
                {originalScore} <span className="text-xs text-slate-500">/ {maxScore} pts</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                New Marks Awarded *
              </label>
              <input
                type="number"
                aria-label="New Marks Awarded"
                min={0}
                max={maxScore}
                step={0.5}
                value={revisedScore}
                onChange={(e) => setRevisedScore(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                required
              />
              <span className="text-[10px] text-slate-400">Max allowed: {maxScore} pts</span>
            </div>
          </div>

          {/* Mandatory Reason Input (BR-012, Rule 7) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Mandatory Justification Reason *
              </label>
              <span className="text-[10px] text-amber-700 font-mono font-medium">
                Audited (Rule 7)
              </span>
            </div>
            <textarea
              aria-label="Mandatory Justification Reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a clear, detailed justification for this score adjustment (e.g. Candidate submitted valid alternative algorithm; awarded 4 marks per rubric)..."
              className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400"
              required
            />
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div
              data-testid="correction-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Mandatory Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              aria-label="Confirm score modification audit stamp"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-600 font-medium">
              I confirm this score modification will recalculate dependent percentages, update ranking, and be stamped permanently into the immutable audit trail.
            </span>
          </label>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Confirm Score Correction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
