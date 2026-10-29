/**
 * VeriSync Manual Evaluation Queue View
 * Allows Evaluators & Super Admins to review and score pending subjective answers.
 * Traceability: UC-14, FR-SCORE-004, FR-SCORE-005, FR-SCORE-008, FR-ADMIN-009
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Filter, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { resultsApi } from '../../api/results';
import { assessmentsApi } from '../../api/assessments';
import { EvaluationQueueItem, SubmitEvaluationPayload } from '../../types/api';
import { EvaluationCard } from './EvaluationCard';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

interface EvaluationQueueViewProps {
  onEvaluationCompleted?: () => void;
}

export const EvaluationQueueView: React.FC<EvaluationQueueViewProps> = ({
  onEvaluationCompleted,
}) => {
  const queryClient = useQueryClient();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('ALL');

  // Fetch assessments for filter
  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments-list-filter'],
    queryFn: () => assessmentsApi.getAssessments(),
  });

  // Fetch pending evaluation items
  const {
    data: queueItems = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['evaluation-queue', selectedAssessmentId],
    queryFn: () =>
      resultsApi.getEvaluationQueue({
        assessmentId: selectedAssessmentId === 'ALL' ? undefined : selectedAssessmentId,
      }),
  });

  // Mutation to submit evaluation
  const submitMutation = useMutation({
    mutationFn: (payload: SubmitEvaluationPayload) => resultsApi.submitEvaluation(payload),
    onSuccess: (data) => {
      showSuccessToast(
        'Evaluation Submitted',
        `Awarded marks recorded. Result status: ${data.resultStatus} (CID: ${data.correlationId}).`,
      );
      queryClient.invalidateQueries({ queryKey: ['evaluation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-results'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      if (onEvaluationCompleted) onEvaluationCompleted();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Evaluation submission failed.';
      showErrorToast('Submission Failed', msg);
    },
  });

  const handleEvaluationSubmit = async (payload: SubmitEvaluationPayload) => {
    await submitMutation.mutateAsync(payload);
  };

  const assessments = assessmentsData?.assessments || [
    { id: 'asmt-01', title: 'Frontend Developer Test' },
    { id: 'asmt-02', title: 'Data Analyst Assessment' },
    { id: 'asmt-03', title: 'Full Stack Engineering Assessment' },
  ];

  return (
    <div className="space-y-5">
      {/* Header and Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Subjective Evaluation Queue ({queueItems.length} Pending)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Grade short-answer, descriptive, and scenario answers using scoring rubrics (UC-14)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter queue by assessment"
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Assessments</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Queue Body */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-600" />
          <p className="font-semibold text-sm">Failed to load manual evaluation queue.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Evaluation Queue Clear</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All submitted candidate responses for subjective questions have been evaluated. All
            corresponding candidate results are marked Final (FR-SCORE-008).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((item: EvaluationQueueItem) => (
            <EvaluationCard
              key={item.id}
              item={item}
              onSubmit={handleEvaluationSubmit}
              isSubmitting={submitMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};
