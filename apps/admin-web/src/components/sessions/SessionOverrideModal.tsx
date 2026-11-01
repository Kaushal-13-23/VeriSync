/**
 * Admin Session Override Dialog
 * Supports EXTEND, REOPEN, PAUSE, RESUME, and CANCEL overrides.
 * Enforces mandatory justification reason and durable audit trail logging.
 * Traceability: BR-012, FR-ADMIN-004, FR-TIME-011, Rule 7, Rule 9
 */

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Ban,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { LiveSessionRecord, SessionOverrideType, SessionOverridePayload } from '../../types/api';

interface SessionOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LiveSessionRecord | null;
  onSubmit: (payload: SessionOverridePayload) => Promise<void>;
  isSubmitting: boolean;
}

const OVERRIDE_OPTIONS: {
  type: SessionOverrideType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  {
    type: 'EXTEND',
    title: 'Extend Deadline',
    description: 'Grant additional minutes to compensate for technical or lab delays.',
    icon: Clock,
    accentColor: 'text-blue-600',
  },
  {
    type: 'PAUSE',
    title: 'Pause Exam Timer',
    description: 'Freeze exam countdown due to ongoing network or facility disruption.',
    icon: Pause,
    accentColor: 'text-yellow-600',
  },
  {
    type: 'RESUME',
    title: 'Resume Exam Timer',
    description: 'Unfreeze countdown and restore candidate examination progression.',
    icon: Play,
    accentColor: 'text-emerald-600',
  },
  {
    type: 'REOPEN',
    title: 'Reopen Session',
    description: 'Restore expired or interrupted attempt with a fresh extension window.',
    icon: RotateCcw,
    accentColor: 'text-purple-600',
  },
  {
    type: 'CANCEL',
    title: 'Cancel / Void Attempt',
    description: 'Permanently invalidate this attempt due to malpractice or policy breach.',
    icon: Ban,
    accentColor: 'text-rose-600',
  },
];

export const SessionOverrideModal: React.FC<SessionOverrideModalProps> = ({
  isOpen,
  onClose,
  session,
  onSubmit,
  isSubmitting,
}) => {
  const [overrideType, setOverrideType] = useState<SessionOverrideType>('EXTEND');
  const [extensionMinutes, setExtensionMinutes] = useState<number>(15);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // BR-012 & Rule 7: Mandatory reason validation
    if (!reason.trim()) {
      setValidationError(
        'A mandatory justification reason is required for administrative overrides (BR-012).',
      );
      return;
    }

    if (!confirmed) {
      setValidationError('You must confirm the administrative action before applying.');
      return;
    }

    setValidationError(null);

    try {
      await onSubmit({
        overrideType,
        reason: reason.trim(),
        extensionMinutes:
          overrideType === 'EXTEND' || overrideType === 'REOPEN' ? extensionMinutes : undefined,
        notes: notes.trim() || undefined,
      });
      // reset form
      setReason('');
      setNotes('');
      setConfirmed(false);
      onClose();
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : 'Override failed. Check server response.',
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="session-override-modal"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Administrative Override</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Session: {session.id} • Candidate: {session.candidateIdentifier} (
                {session.candidateName})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="close-override-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {/* Validation Alert */}
          {validationError && (
            <div
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5"
              data-testid="override-validation-error"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Validation Error</span>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {/* Current Session Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between items-center">
              <span>Assessment:</span>
              <span className="font-semibold text-slate-800">{session.assessmentTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Current Status:</span>
              <span className="font-semibold font-mono text-blue-700">{session.status}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Remaining Authoritative Time:</span>
              <span className="font-mono font-bold text-slate-900">
                {Math.floor(session.overallRemainingSeconds / 60)}m{' '}
                {session.overallRemainingSeconds % 60}s
              </span>
            </div>
          </div>

          {/* Override Action Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Override Action <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OVERRIDE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = overrideType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setOverrideType(opt.type)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                    data-testid={`override-opt-${opt.type}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${opt.accentColor}`} />
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{opt.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extension Duration (only if EXTEND or REOPEN) */}
          {(overrideType === 'EXTEND' || overrideType === 'REOPEN') && (
            <div className="space-y-1.5 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
              <label className="block text-xs font-semibold text-blue-900">
                Extension Duration (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={extensionMinutes}
                  onChange={(e) =>
                    setExtensionMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))
                  }
                  className="w-28 px-3 py-1.5 text-sm font-semibold border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-extension-minutes"
                />
                <span className="text-xs text-blue-700">
                  minutes added to candidate session clock
                </span>
              </div>
            </div>
          )}

          {/* Mandatory Reason Input (BR-012, Rule 7) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Justification Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Provide a mandatory reason for this override (e.g. Lab 4 network switch failed; electrical power surge; supervisor approved time extension)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              data-testid="input-override-reason"
            />
            <p className="text-[11px] text-slate-500">
              Per BR-012 and Rule 7, this reason is durably recorded in the immutable audit log with
              your operator ID.
            </p>
          </div>

          {/* Incident Resolution Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Incident / Supervisor Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for technical evaluator / supervisor review..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-override-notes"
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                data-testid="override-confirm-checkbox"
              />
              <span>
                I confirm this administrative override is necessary and acknowledge that my
                username, IP address, and timestamp will be permanently recorded in the audit trail.
              </span>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              data-testid="btn-cancel-override"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50"
              data-testid="btn-submit-override"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Applying Override...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply {overrideType} Override</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
