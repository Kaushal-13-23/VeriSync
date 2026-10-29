/**
 * VeriSync Manual Evaluation Card
 * Displays subjective response, rubric breakdown, mark entry, and evaluator feedback comments.
 * Traceability: UC-14, FR-SCORE-004, FR-SCORE-005, FR-SCORE-008, Rule 9
 */

import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { EvaluationQueueItem, SubmitEvaluationPayload } from '../../types/api';

interface EvaluationCardProps {
  item: EvaluationQueueItem;
  onSubmit: (payload: SubmitEvaluationPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  item,
  onSubmit,
  isSubmitting = false,
}) => {
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    item.rubricCriteria.forEach((r) => {
      initial[r.id] = r.maxMarks;
    });
    return initial;
  });

  const [totalAwarded, setTotalAwarded] = useState<number>(item.maxMarks);
  const [comments, setComments] = useState<string>('');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRubricScoreChange = (rubricId: string, val: number) => {
    const updated = { ...rubricScores, [rubricId]: val };
    setRubricScores(updated);

    // Auto-sum total marks
    const sum = Object.values(updated).reduce((acc, curr) => acc + curr, 0);
    setTotalAwarded(Math.min(item.maxMarks, Math.max(0, sum)));
  };

  const handleTotalScoreChange = (val: number) => {
    setTotalAwarded(Math.min(item.maxMarks, Math.max(0, val)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalAwarded < 0 || totalAwarded > item.maxMarks) {
      setErrorMsg(`Marks awarded must be between 0 and ${item.maxMarks} pts.`);
      return;
    }

    try {
      await onSubmit({
        queueItemId: item.id,
        awardedMarks: totalAwarded,
        rubricScores,
        comments: comments.trim(),
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit evaluation.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:border-slate-300 transition-colors">
      {/* Top Banner */}
      <div className="px-5 py-3.5 bg-slate-50/75 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{item.candidateName}</span>
          <span className="font-mono text-slate-400">({item.candidateIdentifier})</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-medium">{item.assessmentTitle}</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Submitted {new Date(item.submittedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Question Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
              <FileText className="w-3.5 h-3.5" />
              <span>{item.questionTitle}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
              Max Marks: {item.maxMarks} pts
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
            {item.questionPrompt}
          </p>
        </div>

        {/* Candidate's Submitted Response */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Candidate Submitted Answer
          </label>
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {item.candidateAnswer}
          </div>
        </div>

        {/* Reference Answer Accordion */}
        {item.referenceAnswer && (
          <div>
            <button
              type="button"
              onClick={() => setShowReference(!showReference)}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showReference ? 'Hide Reference Answer' : 'Show Reference Answer'}</span>
            </button>
            {showReference && (
              <div className="mt-2 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <span className="font-semibold text-emerald-800">Evaluator Reference: </span>
                {item.referenceAnswer}
              </div>
            )}
          </div>
        )}

        {/* Scoring Rubric Section */}
        {item.rubricCriteria.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Scoring Rubric Breakdown (FR-SCORE-004)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {item.rubricCriteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1.5 text-xs"
                >
                  <div className="font-semibold text-slate-800 truncate" title={criterion.name}>
                    {criterion.name}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2" title={criterion.description}>
                    {criterion.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Max: {criterion.maxMarks} pts</span>
                    <input
                      type="number"
                      aria-label={`Score for ${criterion.name}`}
                      min={0}
                      max={criterion.maxMarks}
                      step={0.5}
                      value={rubricScores[criterion.id] ?? criterion.maxMarks}
                      onChange={(e) =>
                        handleRubricScoreChange(criterion.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-16 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg text-right focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Marks Awarded & Evaluator Feedback Comments */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Total Marks Awarded *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Total Marks Awarded"
                min={0}
                max={item.maxMarks}
                step={0.5}
                value={totalAwarded}
                onChange={(e) => handleTotalScoreChange(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
              <span className="text-xs text-slate-400 font-medium">/ {item.maxMarks} pts</span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Evaluator Comments & Feedback (FR-SCORE-005)
            </label>
            <div className="relative">
              <input
                type="text"
                aria-label="Evaluator Comments"
                placeholder="Optional constructive comments visible on candidate report..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting Evaluation...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Submit Evaluation & Award Marks</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
