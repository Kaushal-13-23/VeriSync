/**
 * Integrity & Lockdown Security Events Panel
 * Displays client lockdown integrity telemetry with the non-negotiable SRS note.
 * Traceability: FR-LAB-006, SRS 10.3 (Line 762), SRS 11.4, BR-015, Rule 9, NFR-USE-005
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  EyeOff,
  LogOut,
  Keyboard,
  Cpu,
  Copy,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { sessionsApi } from '../../api/sessions';
import {
  LockdownEventType,
  IntegritySeverity,
} from '../../types/api';

interface IntegrityEventsPanelProps {
  sessionId?: string;
  compact?: boolean;
}

export const IntegrityEventsPanel: React.FC<IntegrityEventsPanelProps> = ({
  sessionId,
  compact = false,
}) => {
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['integrity-events', sessionId],
    queryFn: () => sessionsApi.getIntegrityEvents(sessionId),
    refetchInterval: 10000, // 10s auto-refresh
  });

  const getEventIcon = (type: LockdownEventType) => {
    switch (type) {
      case 'FOCUS_LOST':
      case 'WINDOW_BLUR':
        return <EyeOff className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />;
      case 'EXIT_ATTEMPT':
      case 'FULLSCREEN_EXIT':
        return <LogOut className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />;
      case 'SHORTCUT_TRIPPED':
        return <Keyboard className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />;
      case 'PROHIBITED_PROCESS_DETECTED':
        return <Cpu className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />;
      case 'CLIPBOARD_ACCESSED':
        return <Copy className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />;
    }
  };

  const getSeverityBadge = (severity: IntegritySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            LOW
          </span>
        );
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (typeFilter !== 'ALL' && e.eventType !== typeFilter) return false;
    if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCandidate =
        e.candidateName.toLowerCase().includes(q) ||
        e.candidateIdentifier.toLowerCase().includes(q) ||
        e.details.description.toLowerCase().includes(q) ||
        (e.details.processName && e.details.processName.toLowerCase().includes(q)) ||
        (e.details.windowTitle && e.details.windowTitle.toLowerCase().includes(q)) ||
        (e.details.shortcutKey && e.details.shortcutKey.toLowerCase().includes(q));
      if (!matchCandidate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4" data-testid="integrity-events-panel">
      {/* MANDATORY PROCTORING NOTICE (SRS 10.3 / Line 762, BR-015) */}
      <div
        className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-xs"
        role="alert"
        data-testid="integrity-conclusiveness-notice"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-900 tracking-tight">
            Important Proctoring Advisory (SRS 10.3 & BR-015)
          </h4>
          <p className="text-amber-800 leading-relaxed font-medium">
            <strong>A single integrity event is not conclusive proof of cheating.</strong> External
            system notifications, OS accessibility prompts, background driver dialogs, or inadvertent
            keystrokes can trigger security events. Proctors must evaluate cumulative timeline patterns,
            verify with physical room supervisors, and document mandatory reasons before taking disciplinary
            action.
          </p>
        </div>
      </div>

      {/* Filters (only in full mode) */}
      {!compact && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, process, or shortcut..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              data-testid="input-search-integrity"
              aria-label="Search integrity events"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
              data-testid="select-integrity-type"
              aria-label="Filter by integrity event type"
            >
              <option value="ALL">All Event Types</option>
              <option value="FOCUS_LOST">Focus Lost / Window Blur</option>
              <option value="EXIT_ATTEMPT">Exit Attempt</option>
              <option value="PROHIBITED_PROCESS_DETECTED">Prohibited Process</option>
              <option value="SHORTCUT_TRIPPED">Shortcut Tripped</option>
              <option value="CLIPBOARD_ACCESSED">Clipboard Read</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
              data-testid="select-integrity-severity"
              aria-label="Filter by event severity"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* Events Table / List */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500 text-xs" data-testid="integrity-loading">
          Loading integrity telemetry events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-1.5"
          data-testid="no-integrity-events"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" aria-hidden="true" />
          <h5 className="font-semibold text-slate-800 text-xs">No Security Integrity Events</h5>
          <p className="text-[11px] text-slate-500">
            {sessionId
              ? 'No lockdown or security violations detected for this session.'
              : 'All active workstations are operating within secure lockdown parameters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse text-xs"
              data-testid="integrity-events-table"
              aria-label="Candidate Integrity Events Stream"
            >
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th scope="col" className="px-4 py-3">
                    Timestamp (UTC)
                  </th>
                  {!sessionId && (
                    <th scope="col" className="px-4 py-3">
                      Candidate
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3">
                    Event Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Severity
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Telemetry Details
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Correlation ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-slate-50/70 transition-colors"
                    data-testid={`row-integrity-${event.id}`}
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        <span>
                          {new Date(event.timestamp).toLocaleTimeString('en-US', {
                            timeZone: 'UTC',
                          })}{' '}
                          UTC
                        </span>
                      </div>
                    </td>

                    {/* Candidate */}
                    {!sessionId && (
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">
                          {event.candidateName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {event.candidateIdentifier}
                        </span>
                      </td>
                    )}

                    {/* Event Type */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getEventIcon(event.eventType)}
                        <span className="font-semibold text-slate-700">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">{getSeverityBadge(event.severity)}</td>

                    {/* Telemetry Details */}
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-slate-800 font-medium leading-snug">
                        {event.details.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-[10px] font-mono text-slate-500">
                        {event.details.windowTitle && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            Window: {event.details.windowTitle}
                          </span>
                        )}
                        {event.details.processName && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                            Proc: {event.details.processName}
                          </span>
                        )}
                        {event.details.shortcutKey && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                            Key: {event.details.shortcutKey}
                          </span>
                        )}
                        {event.details.blurDurationMs && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            Blur: {event.details.blurDurationMs}ms
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Correlation ID */}
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {event.correlationId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
