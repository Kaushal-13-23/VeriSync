/**
 * Session Inactivity Warning Modal
 * Displays 60-second warning countdown before auto-terminating administrator session.
 * Traceability: FR-AUTH-007, NFR-SEC-004, NFR-USE-005
 */

import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onContinue,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
      data-testid="session-timeout-modal"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-600 text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-700/60 flex items-center justify-center text-white shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 id="session-timeout-title" className="font-bold text-sm text-white">
              Administrator Inactivity Warning
            </h3>
            <p className="text-[11px] text-amber-100 font-medium">
              Security session auto-revocation policy (FR-AUTH-007).
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-600 mx-auto">
            <Clock className="w-8 h-8 animate-pulse" aria-hidden="true" />
          </div>

          <div>
            <span
              className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight block"
              data-testid="timeout-countdown-seconds"
            >
              {remainingSeconds}s
            </span>
            <p id="session-timeout-desc" className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your session has been idle. To protect candidate examination integrity, your administrator
              session will automatically terminate when the countdown reaches zero.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 text-left">
            <span>
              Per <strong>NFR-SEC-004</strong>, ephemeral administrator credentials require active engagement.
              Click below to maintain your authenticated access.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
              data-testid="btn-timeout-logout"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Log Out Now</span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="btn-timeout-continue"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              <span>Continue Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
