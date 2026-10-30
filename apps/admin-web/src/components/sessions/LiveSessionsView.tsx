/**
 * VeriSync Live Candidate Sessions & Oversight View
 * Real-time monitoring, auto-refresh polling, and administrative session overrides.
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-004, FR-TIME-001, BR-012, Rule 7
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../../api/sessions';
import { LiveSessionRecord, SessionOverridePayload } from '../../types/api';
import { LiveSessionFilters, AutoRefreshInterval } from './LiveSessionFilters';
import { LiveSessionsTable } from './LiveSessionsTable';
import { SessionOverrideModal } from './SessionOverrideModal';
import { SessionDetailModal } from './SessionDetailModal';
import { toastManager } from '../../lib/toast';
import { Radio, AlertCircle } from 'lucide-react';

export const LiveSessionsView: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<AutoRefreshInterval>(10000); // 10s default
  const [selectedOverrideSession, setSelectedOverrideSession] = useState<LiveSessionRecord | null>(
    null,
  );
  const [selectedDetailSession, setSelectedDetailSession] = useState<LiveSessionRecord | null>(
    null,
  );

  // TanStack Query for live sessions with polling
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['live-sessions', { status: statusFilter, search }],
    queryFn: () =>
      sessionsApi.getLiveSessions({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
      }),
    refetchInterval: autoRefreshInterval > 0 ? autoRefreshInterval : false,
    refetchIntervalInBackground: false,
  });

  const sessions = data?.sessions || [];
  const counts = {
    total: data?.total ?? 0,
    activeCount: data?.activeCount ?? 0,
    interruptedCount: data?.interruptedCount ?? 0,
    pausedCount: data?.pausedCount ?? 0,
    submittedCount: data?.submittedCount ?? 0,
    expiredCount: data?.expiredCount ?? 0,
  };

  // Override mutation
  const overrideMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SessionOverridePayload }) =>
      sessionsApi.applyOverride(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toastManager.show({
        type: 'success',
        title: 'Override Applied',
        message: `${result.message} [Correlation ID: ${result.correlationId}]`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Override Rejected',
        message: err.message || 'Administrative override failed.',
      });
    },
  });

  const handleApplyOverride = async (payload: SessionOverridePayload) => {
    if (!selectedOverrideSession) return;
    await overrideMutation.mutateAsync({
      id: selectedOverrideSession.id,
      payload,
    });
  };

  return (
    <div className="space-y-6" data-testid="live-sessions-view">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
            <span>Live Session Monitoring</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time candidate telemetry, exam timing countdowns, and authoritative admin
            overrides.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Unable to fetch live sessions</h4>
            <p className="text-xs text-rose-600 mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Filters and telemetry counters */}
      <LiveSessionFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        autoRefreshInterval={autoRefreshInterval}
        onAutoRefreshChange={setAutoRefreshInterval}
        onManualRefresh={() => refetch()}
        isFetching={isFetching}
        counts={counts}
      />

      {/* Live Sessions Table */}
      <LiveSessionsTable
        sessions={sessions}
        isLoading={isLoading}
        onOpenOverride={(sess) => setSelectedOverrideSession(sess)}
        onOpenDetails={(sess) => setSelectedDetailSession(sess)}
      />

      {/* Admin Override Modal */}
      <SessionOverrideModal
        isOpen={Boolean(selectedOverrideSession)}
        onClose={() => setSelectedOverrideSession(null)}
        session={selectedOverrideSession}
        onSubmit={handleApplyOverride}
        isSubmitting={overrideMutation.isPending}
      />

      {/* Session Details Modal */}
      <SessionDetailModal
        isOpen={Boolean(selectedDetailSession)}
        onClose={() => setSelectedDetailSession(null)}
        session={selectedDetailSession}
        onOpenOverride={(sess) => setSelectedOverrideSession(sess)}
      />
    </div>
  );
};
