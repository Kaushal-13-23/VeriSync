/**
 * VeriSync Audit Logs & Incident Oversight View
 * Provides searchable audit trail, correlation ID lookup, CSV export, and SRS 11.4 incident logs.
 * Traceability: FR-ADMIN-007, FR-ADMIN-008, SRS 11.4, Rule 7, Rule 9
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/audit';
import { AuditLogFilterParams } from '../../types/api';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';
import { IncidentLogView } from './IncidentLogView';
import { toastManager } from '../../lib/toast';
import { History, ShieldAlert, AlertCircle } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'incidents'>('audit');
  const [filters, setFilters] = useState<AuditLogFilterParams>({
    page: 1,
    limit: 50,
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Audit logs query
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    error: auditError,
  } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditApi.getAuditLogs(filters),
  });

  // Incidents query
  const {
    data: incidentData,
    isLoading: isLoadingIncidents,
    error: incidentError,
  } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => auditApi.getIncidents(),
  });

  const handleFilterChange = (key: keyof AuditLogFilterParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({ page: 1, limit: 50 });
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csv = await auditApi.exportAuditLogsCsv(filters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `verisync-audit-log-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toastManager.show({
        type: 'success',
        title: 'Export Complete',
        message: 'Audit logs exported successfully as CSV.',
      });
    } catch (err: unknown) {
      toastManager.show({
        type: 'error',
        title: 'Export Failed',
        message: err instanceof Error ? err.message : 'Failed to export audit logs.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="audit-logs-view">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Audit Trail & Incident Oversight</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable system audit logs, correlation ID traceability, and supervisor incident
            reports.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'audit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            data-testid="subtab-audit-logs"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs ({auditData?.total ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('incidents')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'incidents'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            data-testid="subtab-incident-logs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Incidents & Overrides ({incidentData?.length ?? 0})</span>
          </button>
        </div>
      </div>

      {/* Error Banners */}
      {(auditError || incidentError) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Unable to fetch records</h4>
            <p className="text-xs text-rose-600 mt-0.5">
              {((auditError || incidentError) as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeSubTab === 'audit' ? (
        <div className="space-y-4">
          <AuditLogFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onExportCsv={handleExportCsv}
            isExporting={isExporting}
            totalEntries={auditData?.total ?? 0}
          />

          <AuditLogTable entries={auditData?.entries || []} isLoading={isLoadingAudit} />
        </div>
      ) : (
        <IncidentLogView incidents={incidentData || []} isLoading={isLoadingIncidents} />
      )}
    </div>
  );
};
