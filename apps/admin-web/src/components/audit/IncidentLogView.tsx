/**
 * Incident Log View for SRS 11.4 Roles (Super Admin, Technical Evaluators, Lab Supervisors)
 * Displays technical disruptions, override incident notes, severity levels, and resolution status.
 * Traceability: FR-ADMIN-008, SRS 11.4, BR-012, Rule 7
 */

import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { IncidentRecord, IncidentSeverity } from '../../types/api';

interface IncidentLogViewProps {
  incidents: IncidentRecord[];
  isLoading: boolean;
}

const SEVERITY_BADGES: Record<IncidentSeverity, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-300',
  MEDIUM: 'bg-yellow-50 text-yellow-800 border-yellow-300 font-semibold',
  HIGH: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
  CRITICAL: 'bg-rose-50 text-rose-800 border-rose-300 font-bold animate-pulse',
};

export const IncidentLogView: React.FC<IncidentLogViewProps> = ({ incidents, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Retrieving incident and disruption records...</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div
        className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center"
        data-testid="empty-incidents"
      >
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No active incidents recorded</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          All test centers and candidate sessions are operating normally with zero recorded
          overrides.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="incident-log-view">
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">SRS 11.4 Incident Telemetry Notice</span>
          <span>
            Incidents capture administrative overrides, technical disruptions, and supervisor notes
            logged during active assessment execution.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {incidents.map((inc) => {
          const badgeClass = SEVERITY_BADGES[inc.severity] || SEVERITY_BADGES.LOW;

          return (
            <div
              key={inc.id}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              data-testid={`incident-card-${inc.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono border ${badgeClass}`}
                  >
                    {inc.severity}
                  </span>
                  <h4 className="font-semibold text-sm text-slate-900">{inc.title}</h4>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  {new Date(inc.timestamp).toISOString().replace('T', ' ').replace('Z', ' UTC')}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{inc.description}</p>

              {/* Context Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">
                    Candidate & Session
                  </span>
                  <span className="font-medium text-slate-800">
                    {inc.candidateName || 'N/A'} ({inc.candidateIdentifier || 'General'})
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{inc.sessionId}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">
                    Override Action
                  </span>
                  <span className="font-mono font-semibold text-blue-700">
                    {inc.overrideAction || 'SYSTEM_MONITOR'}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">By: {inc.actor}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">
                    Correlation ID
                  </span>
                  <span className="font-mono text-[11px] text-slate-600 truncate block">
                    {inc.correlationId}
                  </span>
                </div>
              </div>

              {/* Resolution Notes */}
              {inc.resolutionNotes && (
                <div className="text-xs bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-blue-900">
                  <span className="font-semibold text-[11px] block text-blue-950">
                    Resolution & Supervisor Notes:
                  </span>
                  <p className="mt-0.5 text-slate-700">{inc.resolutionNotes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
