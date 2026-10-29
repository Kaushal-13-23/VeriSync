/**
 * Session Detail Modal Component
 * Displays comprehensive session telemetry, timeline events, and override records.
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-CAN-006, Rule 1, Rule 9
 */

import React from 'react';
import { X, Monitor, AlertCircle, FileText, Sliders } from 'lucide-react';
import { LiveSessionRecord } from '../../types/api';

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSessionRecord | null;
  onOpenOverride: (session: LiveSessionRecord) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  isOpen,
  onClose,
  session,
  onOpenOverride,
}) => {
  if (!isOpen || !session) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="session-detail-modal"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
              {session.candidateName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{session.candidateName}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Session ID: {session.id} • Identifier: {session.candidateIdentifier}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="close-session-detail-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block uppercase font-medium">Status</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                {session.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block uppercase font-medium">
                Authoritative Time
              </span>
              <span className="text-sm font-bold text-blue-600 mt-1 block font-mono">
                {Math.floor(session.overallRemainingSeconds / 60)}m{' '}
                {session.overallRemainingSeconds % 60}s
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block uppercase font-medium">
                Progress
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                Q{session.currentQuestionIndex} of {session.totalQuestions}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 block uppercase font-medium">
                Extensions
              </span>
              <span className="text-sm font-bold text-purple-700 mt-1 block font-mono">
                +{session.extensionMinutesApplied || 0} mins
              </span>
            </div>
          </div>

          {/* Assessment & Telemetry Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assessment Meta */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Assessment Info</span>
              </h4>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Title:</span>
                  <span className="font-medium text-slate-800 text-right">
                    {session.assessmentTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assessment ID:</span>
                  <span className="font-mono text-slate-700">{session.assessmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Candidate Email:</span>
                  <span className="text-slate-700">{session.candidateEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Started At:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(session.startedAt).toLocaleTimeString()} UTC
                  </span>
                </div>
              </div>
            </div>

            {/* Client Telemetry */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <span>Client Telemetry (Rule 1)</span>
              </h4>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Terminal IP:</span>
                  <span className="font-mono font-medium text-slate-800">{session.clientIp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client Version:</span>
                  <span className="font-mono text-slate-700">v{session.clientVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Heartbeat:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(session.lastHeartbeatAt).toLocaleTimeString()} UTC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clock Source:</span>
                  <span className="text-emerald-700 font-medium">Server Authoritative (UTC)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Override Reason / Notes Banner if present */}
          {(session.overrideReason || session.notes) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Administrative Override Record (BR-012)</span>
              </div>
              {session.overrideReason && (
                <div className="text-amber-800">
                  <span className="font-medium">Mandatory Justification: </span>
                  <span>{session.overrideReason}</span>
                </div>
              )}
              {session.notes && (
                <div className="text-amber-700 text-[11px]">
                  <span className="font-medium">Incident Notes: </span>
                  <span>{session.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOverride(session);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            data-testid="modal-trigger-override-btn"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Apply Administrative Override</span>
          </button>
        </div>
      </div>
    </div>
  );
};
