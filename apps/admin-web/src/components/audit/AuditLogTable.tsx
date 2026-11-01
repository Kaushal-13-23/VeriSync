/**
 * VeriSync Audit Log Table Component
 * Displays immutable audit events, actor attribution, mandatory justification reasons, and correlation IDs.
 * Traceability: FR-ADMIN-007, BR-012, Rule 7, Rule 9, SRS 8.3.3
 */

import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { AuditLogEntry, AuditOutcome } from '../../types/api';

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  isLoading: boolean;
}

const EVENT_TYPE_STYLES: Record<string, { label: string; badge: string }> = {
  SESSION_OVERRIDE: {
    label: 'SESSION_OVERRIDE',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
  },
  ASSESSMENT_PUBLISH: {
    label: 'ASSESSMENT_PUBLISH',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  ASSESSMENT_STATUS: {
    label: 'ASSESSMENT_STATUS',
    badge: 'bg-blue-50 text-blue-800 border-blue-300',
  },
  SESSION_START: {
    label: 'SESSION_START',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  SESSION_SUBMIT: {
    label: 'SESSION_SUBMIT',
    badge: 'bg-purple-50 text-purple-800 border-purple-300',
  },
  PASSWORD_RESET: {
    label: 'PASSWORD_RESET',
    badge: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  },
  SECURITY_ALERT: {
    label: 'SECURITY_ALERT',
    badge: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
  },
};

const OUTCOME_STYLES: Record<AuditOutcome, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  BLOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ entries, isLoading }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (correlationId: string) => {
    navigator.clipboard.writeText(correlationId);
    setCopiedId(correlationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Retrieving authoritative audit log entries...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center"
        data-testid="empty-audit-logs"
      >
        <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No audit log records found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No audit records match your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"
      data-testid="audit-log-table-card"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" data-testid="audit-log-table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-3">Event Type</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-3">Entity</th>
              <th className="py-3 px-3">Outcome</th>
              <th className="py-3 px-4">Justification Reason</th>
              <th className="py-3 px-4">Correlation ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {entries.map((entry) => {
              const eventCfg = EVENT_TYPE_STYLES[entry.eventType] || {
                label: entry.eventType,
                badge: 'bg-slate-100 text-slate-700 border-slate-200',
              };
              const outcomeStyle = OUTCOME_STYLES[entry.outcome] || OUTCOME_STYLES.SUCCESS;
              const isCopied = copiedId === entry.correlationId;

              return (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-50/70 transition-colors"
                  data-testid={`audit-row-${entry.id}`}
                >
                  {/* Timestamp (UTC ISO-8601 per Rule 9) */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                    <div>
                      {new Date(entry.timestamp)
                        .toISOString()
                        .replace('T', ' ')
                        .replace('Z', ' UTC')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      IP: {entry.ipAddress}
                    </div>
                  </td>

                  {/* Event Type */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${eventCfg.badge}`}
                      data-testid={`audit-event-${entry.id}`}
                    >
                      {entry.eventType}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{entry.actorName}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {entry.actorRole} • {entry.actorId}
                    </div>
                  </td>

                  {/* Entity */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800 capitalize">{entry.entityType}</div>
                    <div className="text-[10px] font-mono text-slate-400">{entry.entityId}</div>
                  </td>

                  {/* Outcome */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${outcomeStyle}`}
                      data-testid={`audit-outcome-${entry.id}`}
                    >
                      {entry.outcome}
                    </span>
                  </td>

                  {/* Mandatory Justification Reason (BR-012, Rule 7) */}
                  <td className="py-3 px-4 max-w-xs">
                    <p
                      className="text-slate-700 line-clamp-2 leading-relaxed"
                      title={entry.reason || 'None'}
                    >
                      {entry.reason || (
                        <span className="text-slate-400 italic">No justification recorded</span>
                      )}
                    </p>
                  </td>

                  {/* Correlation ID (Copyable, Rule 9) */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      <span className="truncate max-w-[130px]" title={entry.correlationId}>
                        {entry.correlationId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(entry.correlationId)}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy correlation ID"
                        data-testid={`copy-correlation-${entry.id}`}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>Showing {entries.length} audited operational records</span>
        <span className="font-mono text-[11px]">Durable audit retention (Rule 7, Rule 9)</span>
      </div>
    </div>
  );
};
