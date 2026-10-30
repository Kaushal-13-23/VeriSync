/**
 * VeriSync Assessment Reports & Analytics View
 * Displays aggregated assessment summary metrics, candidate ranking leaderboard, and question-level performance charts.
 * Traceability: FR-ADMIN-005, FR-ADMIN-006, FR-SCORE-009, Rule 9
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Trophy,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  Award,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { assessmentsApi } from '../../api/assessments';
import { RankingTable } from './RankingTable';
import { QuestionStatsCharts } from './QuestionStatsCharts';

export const ReportsView: React.FC = () => {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('asmt-01');
  const [activeReportTab, setActiveReportTab] = useState<'rankings' | 'questions'>('rankings');

  // Fetch assessments for selector
  const { data: assessmentsData } = useQuery({
    queryKey: ['assessments-list-reports'],
    queryFn: () => assessmentsApi.getAssessments(),
  });

  // Fetch assessment summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    isFetching,
  } = useQuery({
    queryKey: ['reports-summary', selectedAssessmentId],
    queryFn: () => reportsApi.getAssessmentSummary(selectedAssessmentId),
  });

  // Fetch rankings
  const { data: rankings = [], isLoading: isRankingsLoading } = useQuery({
    queryKey: ['reports-rankings', selectedAssessmentId],
    queryFn: () => reportsApi.getCandidateRankings(selectedAssessmentId),
  });

  // Fetch question stats
  const { data: questionStats = [], isLoading: isQuestionStatsLoading } = useQuery({
    queryKey: ['reports-question-stats', selectedAssessmentId],
    queryFn: () => reportsApi.getQuestionStats(selectedAssessmentId),
  });

  const assessments = assessmentsData?.assessments || [
    { id: 'asmt-01', title: 'Frontend Developer Test' },
    { id: 'asmt-02', title: 'Data Analyst Assessment' },
    { id: 'asmt-03', title: 'Full Stack Engineering Assessment' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header and Assessment Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Assessment Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Aggregated cohort statistics, deterministic rankings, and question-level analytics
            (FR-ADMIN-005)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Select assessment for reports"
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => refetchSummary()}
            disabled={isFetching}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh reports data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Metric Cards (FR-ADMIN-005) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Candidates */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-sky-500" />
            <span>Completed</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isSummaryLoading ? '...' : summary?.totalCompleted || 0}
          </div>
          <div className="text-[11px] text-slate-400">Total Attempts</div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Average Score</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isSummaryLoading ? '...' : `${summary?.averageScorePercentage || 0}%`}
          </div>
          <div className="text-[11px] text-slate-400">Cohort Average</div>
        </div>

        {/* Pass Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Pass Rate</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {isSummaryLoading ? '...' : `${summary?.passRatePercentage || 0}%`}
          </div>
          <div className="text-[11px] text-slate-400">
            Pass benchmark: {summary?.passingThresholdPercentage || 60}%
          </div>
        </div>

        {/* Highest Score */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Highest Score</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isSummaryLoading ? '...' : `${summary?.highestScorePercentage || 0}%`}
          </div>
          <div className="text-[11px] text-slate-400">Top Performer</div>
        </div>

        {/* Lowest Score */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Award className="w-3.5 h-3.5 text-rose-500" />
            <span>Lowest Score</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isSummaryLoading ? '...' : `${summary?.lowestScorePercentage || 0}%`}
          </div>
          <div className="text-[11px] text-slate-400">Bottom Baseline</div>
        </div>

        {/* Average Time */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>Avg Duration</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isSummaryLoading ? '...' : `${summary?.averageTimeTakenMinutes || 0}m`}
          </div>
          <div className="text-[11px] text-slate-400">Completion Speed</div>
        </div>
      </div>

      {/* Subtab Switcher: Leaderboard vs Question Analytics */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveReportTab('rankings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReportTab === 'rankings'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Candidate Leaderboard (FR-SCORE-009)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('questions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeReportTab === 'questions'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Question Analytics & Accuracy (FR-ADMIN-006)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeReportTab === 'rankings' ? (
        <RankingTable rankings={rankings} isLoading={isRankingsLoading} />
      ) : (
        <QuestionStatsCharts stats={questionStats} isLoading={isQuestionStatsLoading} />
      )}
    </div>
  );
};
