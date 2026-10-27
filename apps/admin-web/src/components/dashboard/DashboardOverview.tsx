/**
 * VeriSync Dashboard Overview Screen
 * Integrates 4 Stat Cards, Recent Activity feed, Completion Donut, and Upcoming Assessments.
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-003, FR-ASMT-006, UI_Sample.jpeg
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardList, CheckCircle2, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { dashboardApi } from '../../api/client';
import { StatCard } from './StatCard';
import { RecentActivity } from './RecentActivity';
import { CompletionDonut } from './CompletionDonut';
import { UpcomingAssessments } from './UpcomingAssessments';

interface DashboardOverviewProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>

        {/* Two-column grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-slate-200 p-6" />
          <div className="space-y-6">
            <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
            <div className="h-56 bg-white rounded-2xl border border-slate-200 p-6" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Failed to load dashboard metrics</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {(error as Error)?.message || 'An error occurred while fetching authoritative platform status.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top summary row: Refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            Platform Overview
          </h2>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          title="Refresh metrics from server"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* 4 Stat Cards matching UI_Sample.jpeg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Candidates"
          value={data.totalCandidates.value}
          trend={data.totalCandidates.trend}
          icon={Users}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Assessments"
          value={data.totalAssessments.value}
          trend={data.totalAssessments.trend}
          icon={ClipboardList}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Completed Tests"
          value={data.completedTests.value}
          trend={data.completedTests.trend}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Active Candidates"
          value={data.activeCandidates.value}
          trend={data.activeCandidates.trend}
          icon={UserCheck}
          iconBgColor="bg-cyan-50"
          iconColor="text-cyan-600"
        />
      </div>

      {/* Two-Column Grid: Left Activity / Right Donut & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Activity */}
        <div className="flex flex-col">
          <RecentActivity items={data.recentActivity} />
        </div>

        {/* Right Column: Completion Donut + Upcoming Assessments */}
        <div className="space-y-6 flex flex-col">
          <CompletionDonut stats={data.completionRate} />
          <UpcomingAssessments
            assessments={data.upcomingAssessments}
            onViewAll={() => onNavigateTab && onNavigateTab('assessments')}
          />
        </div>
      </div>
    </div>
  );
};
