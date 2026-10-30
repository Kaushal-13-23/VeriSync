/**
 * Audit Log Filters Component
 * Supports event type, actor, entity, outcome, correlation ID, and date range filtering.
 * Traceability: FR-ADMIN-007, FR-ADMIN-008, Rule 9
 */

import React from 'react';
import { Search, Download, X, ShieldAlert } from 'lucide-react';
import { AuditLogFilterParams } from '../../types/api';

interface AuditLogFiltersProps {
  filters: AuditLogFilterParams;
  onFilterChange: (key: keyof AuditLogFilterParams, value: string | undefined) => void;
  onResetFilters: () => void;
  onExportCsv: () => void;
  isExporting: boolean;
  totalEntries: number;
}

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onExportCsv,
  isExporting,
  totalEntries,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 md:p-5 space-y-4">
      {/* Top search & export bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={filters.actor || ''}
            onChange={(e) => onFilterChange('actor', e.target.value || undefined)}
            placeholder="Search by actor name or ID..."
            className="block w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            data-testid="audit-actor-search"
          />
          {filters.actor && (
            <button
              type="button"
              onClick={() => onFilterChange('actor', undefined)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-72 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={filters.correlationId || ''}
            onChange={(e) => onFilterChange('correlationId', e.target.value || undefined)}
            placeholder="Lookup Correlation ID (e.g. cid-...)"
            className="block w-full pl-9 pr-9 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            data-testid="audit-correlation-search"
          />
          {filters.correlationId && (
            <button
              type="button"
              onClick={() => onFilterChange('correlationId', undefined)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {totalEntries} records
          </span>
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            data-testid="btn-export-audit-csv"
            title="Export filtered audit logs as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Structured filter dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
        {/* Event Type Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Event Type</label>
          <select
            value={filters.eventType || 'ALL'}
            onChange={(e) =>
              onFilterChange('eventType', e.target.value === 'ALL' ? undefined : e.target.value)
            }
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="audit-filter-event-type"
          >
            <option value="ALL">All Event Types</option>
            <option value="SESSION_OVERRIDE">SESSION_OVERRIDE (BR-012)</option>
            <option value="ASSESSMENT_PUBLISH">ASSESSMENT_PUBLISH</option>
            <option value="ASSESSMENT_STATUS">ASSESSMENT_STATUS</option>
            <option value="SESSION_START">SESSION_START</option>
            <option value="SESSION_SUBMIT">SESSION_SUBMIT</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="SECURITY_ALERT">SECURITY_ALERT</option>
          </select>
        </div>

        {/* Entity Type Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Entity</label>
          <select
            value={filters.entityType || 'ALL'}
            onChange={(e) =>
              onFilterChange('entityType', e.target.value === 'ALL' ? undefined : e.target.value)
            }
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="audit-filter-entity"
          >
            <option value="ALL">All Entities</option>
            <option value="session">Session</option>
            <option value="assessment">Assessment</option>
            <option value="candidate">Candidate</option>
            <option value="auth">Auth</option>
          </select>
        </div>

        {/* Outcome Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Outcome</label>
          <select
            value={filters.outcome || 'ALL'}
            onChange={(e) =>
              onFilterChange('outcome', e.target.value === 'ALL' ? undefined : e.target.value)
            }
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="audit-filter-outcome"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {/* Reset */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full py-1.5 px-3 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors font-medium text-xs text-center"
            data-testid="btn-reset-audit-filters"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};
