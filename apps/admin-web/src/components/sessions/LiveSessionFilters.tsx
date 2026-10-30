/**
 * Live Session Filters Component
 * Supports search, status filtering, and auto-refresh intervals.
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, UI_Sample.jpeg
 */

import React from 'react';
import { Search, RefreshCw, X, Radio, AlertTriangle } from 'lucide-react';

export type AutoRefreshInterval = 0 | 10000 | 30000 | 60000;

interface LiveSessionFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  autoRefreshInterval: AutoRefreshInterval;
  onAutoRefreshChange: (interval: AutoRefreshInterval) => void;
  onManualRefresh: () => void;
  isFetching: boolean;
  counts: {
    total: number;
    activeCount: number;
    interruptedCount: number;
    pausedCount: number;
    submittedCount: number;
    expiredCount: number;
  };
}

export const LiveSessionFilters: React.FC<LiveSessionFiltersProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  autoRefreshInterval,
  onAutoRefreshChange,
  onManualRefresh,
  isFetching,
  counts,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 md:p-5 space-y-4">
      {/* Top row: Status counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => onStatusFilterChange('ALL')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/20'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          data-testid="filter-stat-all"
        >
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            All Sessions
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{counts.total}</div>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('ACTIVE')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400/20'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          data-testid="filter-stat-active"
        >
          <div className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </div>
          <div className="text-lg font-bold text-emerald-950 mt-0.5">{counts.activeCount}</div>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('INTERRUPTED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'INTERRUPTED'
              ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400/20'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          data-testid="filter-stat-interrupted"
        >
          <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Interrupted</span>
          </div>
          <div className="text-lg font-bold text-amber-950 mt-0.5">{counts.interruptedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('PAUSED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'PAUSED'
              ? 'bg-yellow-50/80 border-yellow-400 ring-1 ring-yellow-400/20'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          data-testid="filter-stat-paused"
        >
          <div className="text-[11px] font-medium text-yellow-700 uppercase tracking-wider">
            Paused
          </div>
          <div className="text-lg font-bold text-yellow-950 mt-0.5">{counts.pausedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('SUBMITTED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'SUBMITTED'
              ? 'bg-purple-50/80 border-purple-400 ring-1 ring-purple-400/20'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          data-testid="filter-stat-submitted"
        >
          <div className="text-[11px] font-medium text-purple-700 uppercase tracking-wider">
            Submitted
          </div>
          <div className="text-lg font-bold text-purple-950 mt-0.5">{counts.submittedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('EXPIRED')}
          className={`p-2.5 rounded-lg border text-left transition-all ${
            statusFilter === 'EXPIRED'
              ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400/20'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
          data-testid="filter-stat-expired"
        >
          <div className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">
            Expired
          </div>
          <div className="text-lg font-bold text-rose-950 mt-0.5">{counts.expiredCount}</div>
        </button>
      </div>

      {/* Search and Auto-refresh row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Search input */}
        <div className="w-full sm:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search candidate, identifier, or IP..."
            className="block w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            data-testid="live-session-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              data-testid="clear-search-btn"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Auto-refresh selector and manual refresh */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>Auto-refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => onAutoRefreshChange(Number(e.target.value) as AutoRefreshInterval)}
              className="py-1 px-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="auto-refresh-select"
            >
              <option value={0}>Off</option>
              <option value={10000}>Every 10s</option>
              <option value={30000}>Every 30s</option>
              <option value={60000}>Every 60s</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            data-testid="btn-manual-refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
