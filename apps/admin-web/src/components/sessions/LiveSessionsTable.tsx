/**
 * Live Sessions Table Component
 * Displays real-time candidate session telemetry, countdown timers, and override triggers.
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-TIME-001, FR-TIME-002, UI_Sample.jpeg
 */

import React from 'react';
import { Clock, Wifi, Sliders, Eye, Hourglass } from 'lucide-react';
import { LiveSessionRecord, SessionStatus } from '../../types/api';

interface LiveSessionsTableProps {
  sessions: LiveSessionRecord[];
  isLoading: boolean;
  onOpenOverride: (session: LiveSessionRecord) => void;
  onOpenDetails: (session: LiveSessionRecord) => void;
}

const STATUS_BADGES: Record<
  SessionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  ACTIVE: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500 animate-pulse',
  },
  INTERRUPTED: {
    label: 'Interrupted',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  PAUSED: {
    label: 'Paused',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dotClass: 'bg-yellow-500',
  },
  SUBMITTED: {
    label: 'Submitted',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  EXPIRED: {
    label: 'Expired',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

function formatRemainingSeconds(seconds: number): string {
  if (seconds <= 0) return '0m 00s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

function formatHeartbeatAge(isoTimestamp: string): string {
  const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000));
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  return `${diffMins}m ago`;
}

export const LiveSessionsTable: React.FC<LiveSessionsTableProps> = ({
  sessions,
  isLoading,
  onOpenOverride,
  onOpenDetails,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Querying live session engine...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center"
        data-testid="empty-sessions"
      >
        <Hourglass className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">No sessions match current filter</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          There are currently no candidate sessions matching the selected criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"
      data-testid="live-sessions-table-card"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" data-testid="live-sessions-table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Candidate</th>
              <th className="py-3 px-4">Assessment</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Progress</th>
              <th className="py-3 px-3">Remaining Time</th>
              <th className="py-3 px-4">Client Telemetry</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {sessions.map((sess) => {
              const statusCfg = STATUS_BADGES[sess.status] || STATUS_BADGES.ACTIVE;
              const isLowTime =
                sess.status === 'ACTIVE' &&
                sess.overallRemainingSeconds > 0 &&
                sess.overallRemainingSeconds <= 300;
              const isInterrupted = sess.status === 'INTERRUPTED';

              return (
                <tr
                  key={sess.id}
                  className="hover:bg-slate-50/70 transition-colors"
                  data-testid={`session-row-${sess.id}`}
                >
                  {/* Candidate */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{sess.candidateName}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{sess.candidateIdentifier}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{sess.candidateEmail}</span>
                    </div>
                  </td>

                  {/* Assessment */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{sess.assessmentTitle}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      ID: {sess.assessmentId}
                    </div>
                  </td>

                  {/* Status Chip */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.badgeClass}`}
                      data-testid={`status-badge-${sess.id}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </td>

                  {/* Progress / Current Question */}
                  <td className="py-3.5 px-3">
                    <div className="font-medium text-slate-700">
                      Q{sess.currentQuestionIndex} of {sess.totalQuestions}
                    </div>
                    <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (sess.currentQuestionIndex / sess.totalQuestions) * 100)}%`,
                        }}
                      />
                    </div>
                  </td>

                  {/* Remaining Time */}
                  <td className="py-3.5 px-3">
                    <div
                      className={`inline-flex items-center gap-1.5 font-mono font-medium ${
                        isLowTime
                          ? 'text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200'
                          : sess.status === 'SUBMITTED' || sess.status === 'EXPIRED'
                            ? 'text-slate-400'
                            : 'text-slate-800'
                      }`}
                      data-testid={`remaining-time-${sess.id}`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatRemainingSeconds(sess.overallRemainingSeconds)}</span>
                    </div>
                    {sess.extensionMinutesApplied ? (
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                        +{sess.extensionMinutesApplied}m override
                      </div>
                    ) : null}
                  </td>

                  {/* Telemetry (Heartbeat & IP) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Wifi
                        className={`w-3.5 h-3.5 ${isInterrupted ? 'text-amber-500' : 'text-emerald-500'}`}
                      />
                      <span>{formatHeartbeatAge(sess.lastHeartbeatAt)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {sess.clientIp} • v{sess.clientVersion}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenOverride(sess)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        title="Administrative Override (Extend, Reopen, Pause, Cancel)"
                        data-testid={`btn-override-${sess.id}`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Override</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDetails(sess)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Telemetry & Incident Details"
                        data-testid={`btn-details-${sess.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
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
        <span>Showing {sessions.length} live candidate sessions</span>
        <span className="font-mono text-[11px]">Server authoritative clock (Rule 1)</span>
      </div>
    </div>
  );
};
