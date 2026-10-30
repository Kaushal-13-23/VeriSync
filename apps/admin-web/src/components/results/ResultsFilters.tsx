/**
 * VeriSync Results Filters Bar
 * Matches UI Sample (Dropdowns for Assessment, Status, Date range, and Export button).
 * Traceability: FR-ADMIN-005, FR-ADMIN-006, UI_Sample.jpeg
 */

import React from 'react';
import { Search, Download, Filter, Calendar } from 'lucide-react';

interface ResultsFiltersProps {
  assessmentId: string;
  onAssessmentChange: (id: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  passFail: string;
  onPassFailChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onExport: () => void;
  isExporting?: boolean;
  assessments: Array<{ id: string; title: string }>;
}

export const ResultsFilters: React.FC<ResultsFiltersProps> = ({
  assessmentId,
  onAssessmentChange,
  status,
  onStatusChange,
  passFail,
  onPassFailChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  search,
  onSearchChange,
  onExport,
  isExporting = false,
  assessments,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search candidate name, ID, email, or assessment..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder-slate-400 transition-colors"
          />
        </div>

        {/* Dropdowns & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Assessment Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter by assessment"
              value={assessmentId}
              onChange={(e) => onAssessmentChange(e.target.value)}
              className="text-xs bg-slate-50/60 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="ALL">All Assessments</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {/* Result Status Filter (FINAL / PROVISIONAL) */}
          <select
            aria-label="Filter by result status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs bg-slate-50/60 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          >
            <option value="ALL">All Status</option>
            <option value="FINAL">Final</option>
            <option value="PROVISIONAL">Provisional</option>
          </select>

          {/* Pass / Fail Filter */}
          <select
            aria-label="Filter by pass or fail outcome"
            value={passFail}
            onChange={(e) => onPassFailChange(e.target.value)}
            className="text-xs bg-slate-50/60 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          >
            <option value="ALL">All Outcomes</option>
            <option value="PASS">Pass Only</option>
            <option value="FAIL">Fail Only</option>
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-50/60 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-hidden w-28"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-hidden w-28"
            />
          </div>

          {/* Export Button (FR-ADMIN-006) */}
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Export results table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
