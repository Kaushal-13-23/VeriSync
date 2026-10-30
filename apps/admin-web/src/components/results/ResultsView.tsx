/**
 * VeriSync Results & Manual Evaluation View
 * Matches UI Sample Screen 6 with CSV export, detail drawer, score correction, and evaluation queue subtab.
 * Traceability: FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-001..010, UC-14, UC-15, UI_Sample.jpeg
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Inbox } from 'lucide-react';
import { resultsApi } from '../../api/results';
import { assessmentsApi } from '../../api/assessments';
import { useAuth } from '../../store/authContext';
import { AssessmentResultRecord, ScoreCorrectionPayload } from '../../types/api';
import { ResultsFilters } from './ResultsFilters';
import { ResultsTable } from './ResultsTable';
import { ResultDetailDrawer } from './ResultDetailDrawer';
import { ScoreCorrectionModal } from './ScoreCorrectionModal';
import { EvaluationQueueView } from '../evaluation/EvaluationQueueView';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

export const ResultsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentRole = user?.role || 'SUPER_ADMIN';
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

  // Active view tab: 'results' or 'queue'
  const [activeSubTab, setActiveSubTab] = useState<'results' | 'queue'>('results');

  // Filter states
  const [assessmentId, setAssessmentId] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [passFail, setPassFail] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 5;

  // Selected modals / drawer states
  const [selectedResultForDetail, setSelectedResultForDetail] =
    useState<AssessmentResultRecord | null>(null);
  const [selectedResultForCorrection, setSelectedResultForCorrection] =
    useState<AssessmentResultRecord | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch assessments for filter dropdown
  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments-list-filter'],
    queryFn: () => assessmentsApi.getAssessments(),
  });

  // Fetch results
  const {
    data: resultsData,
    isLoading: isResultsLoading,
    refetch: refetchResults,
  } = useQuery({
    queryKey: [
      'admin-results',
      assessmentId,
      status,
      passFail,
      startDate,
      endDate,
      search,
      page,
      limit,
    ],
    queryFn: () =>
      resultsApi.getResults({
        assessmentId: assessmentId === 'ALL' ? undefined : assessmentId,
        status: status as 'ALL' | 'FINAL' | 'PROVISIONAL',
        passFail: passFail as 'ALL' | 'PASS' | 'FAIL',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        page,
        limit,
      }),
  });

  // Fetch evaluation queue count for badge
  const { data: queueItems = [] } = useQuery({
    queryKey: ['evaluation-queue'],
    queryFn: () => resultsApi.getEvaluationQueue(),
  });

  // Score correction mutation
  const correctionMutation = useMutation({
    mutationFn: (payload: ScoreCorrectionPayload) => resultsApi.correctScore(payload),
    onSuccess: (data) => {
      showSuccessToast(
        'Score Corrected Successfully',
        `Updated total: ${data.result.scorePercentage}% (${data.result.passFailStatus}). CID: ${data.correlationId}`,
      );
      queryClient.invalidateQueries({ queryKey: ['admin-results'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reports-rankings'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Score correction failed.';
      showErrorToast('Correction Failed', msg);
    },
  });

  const handleScoreCorrection = async (payload: ScoreCorrectionPayload) => {
    await correctionMutation.mutateAsync(payload);
  };

  // CSV Export feature (FR-ADMIN-006)
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      // Fetch all matching results without page pagination
      const exportData = await resultsApi.getResults({
        assessmentId: assessmentId === 'ALL' ? undefined : assessmentId,
        status: status as 'ALL' | 'FINAL' | 'PROVISIONAL',
        passFail: passFail as 'ALL' | 'PASS' | 'FAIL',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        page: 1,
        limit: 1000,
      });

      const rows = [
        [
          'Candidate Identifier',
          'Candidate Name',
          'Candidate Email',
          'Assessment Title',
          'Score Achieved',
          'Max Marks',
          'Score Percentage',
          'Passing Percentage',
          'Pass/Fail Status',
          'Result Status',
          'Time Taken (Mins)',
          'Completed On (UTC)',
        ],
        ...exportData.results.map((r) => [
          r.candidateIdentifier,
          `"${r.candidateName.replace(/"/g, '""')}"`,
          r.candidateEmail,
          `"${r.assessmentTitle.replace(/"/g, '""')}"`,
          r.totalScore.toString(),
          r.maxScore.toString(),
          `${r.scorePercentage}%`,
          `${r.passingScorePercentage}%`,
          r.passFailStatus,
          r.status,
          r.timeTakenMinutes.toString(),
          r.completedOn,
        ]),
      ];

      const csvContent = rows.map((e) => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `VeriSync_Results_Export_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccessToast(
        'Export Complete',
        `Exported ${exportData.results.length} candidate result records to CSV.`,
      );
    } catch {
      showErrorToast('Export Failed', 'Unable to generate CSV export file.');
    } finally {
      setIsExporting(false);
    }
  };

  const assessments = assessmentsData?.assessments || [
    { id: 'asmt-01', title: 'Frontend Developer Test' },
    { id: 'asmt-02', title: 'Data Analyst Assessment' },
    { id: 'asmt-03', title: 'Full Stack Engineering Assessment' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Subtab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Results & Scoring</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            View candidate examination results, review answers, and grade subjective submissions
          </p>
        </div>

        {/* Subtabs: All Results vs Evaluation Queue */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('results')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'results'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-sky-600" />
            <span>All Results</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('queue')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'queue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-3.5 h-3.5 text-amber-600" />
            <span>Evaluation Queue</span>
            {queueItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {queueItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'results' ? (
        <div className="space-y-4">
          {/* Filters Bar matching UI Sample */}
          <ResultsFilters
            assessmentId={assessmentId}
            onAssessmentChange={(val) => {
              setAssessmentId(val);
              setPage(1);
            }}
            status={status}
            onStatusChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            passFail={passFail}
            onPassFailChange={(val) => {
              setPassFail(val);
              setPage(1);
            }}
            startDate={startDate}
            onStartDateChange={(val) => {
              setStartDate(val);
              setPage(1);
            }}
            endDate={endDate}
            onEndDateChange={(val) => {
              setEndDate(val);
              setPage(1);
            }}
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            onExport={handleExportCsv}
            isExporting={isExporting}
            assessments={assessments}
          />

          {/* Results Table matching UI Sample */}
          <ResultsTable
            results={resultsData?.results || []}
            total={resultsData?.total || 0}
            page={page}
            limit={limit}
            totalPages={resultsData?.totalPages || 1}
            onPageChange={setPage}
            onViewDetails={(res) => setSelectedResultForDetail(res)}
            onCorrectScore={(res) => setSelectedResultForCorrection(res)}
            currentUserRole={currentRole}
            isLoading={isResultsLoading}
          />
        </div>
      ) : (
        <EvaluationQueueView
          onEvaluationCompleted={() => {
            refetchResults();
          }}
        />
      )}

      {/* Result Detail Drawer */}
      <ResultDetailDrawer
        result={selectedResultForDetail}
        isOpen={!!selectedResultForDetail}
        onClose={() => setSelectedResultForDetail(null)}
        onOpenCorrection={(res) => {
          setSelectedResultForDetail(null);
          setSelectedResultForCorrection(res);
        }}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Score Correction Modal (Super Admin Only) */}
      <ScoreCorrectionModal
        result={selectedResultForCorrection}
        isOpen={!!selectedResultForCorrection}
        onClose={() => setSelectedResultForCorrection(null)}
        onSubmitCorrection={handleScoreCorrection}
        isSubmitting={correctionMutation.isPending}
      />
    </div>
  );
};
