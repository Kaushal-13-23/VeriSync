/**
 * Assessment Status Control Modal (Suspend, Resume, Archive)
 * Enforces mandatory reason and confirmation dialog for lifecycle state transitions.
 * Traceability: FR-ADMIN-005, Rule 7, Rule 9
 */

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, Archive } from 'lucide-react';
import { AssessmentRecord, AssessmentStatus } from '../../types/api';

interface AssessmentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentRecord | null;
  targetStatus: AssessmentStatus | null;
  onSubmit: (assessmentId: string, status: AssessmentStatus, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export const AssessmentStatusModal: React.FC<AssessmentStatusModalProps> = ({
  isOpen,
  onClose,
  assessment,
  targetStatus,
  onSubmit,
  isSubmitting,
}) => {
  const [reason, setReason] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assessment || !targetStatus) return null;

  const getStatusMeta = () => {
    switch (targetStatus) {
      case 'SUSPENDED':
        return {
          title: 'Suspend Assessment',
          description:
            'Temporarily suspends candidate access and locks question delivery across all test centers.',
          icon: PauseCircle,
          accentColor: 'text-amber-600',
          confirmBtnClass: 'bg-amber-600 hover:bg-amber-700',
        };
      case 'ACTIVE':
        return {
          title: 'Resume Assessment',
          description:
            'Restores active assessment status and re-enables candidate session initiation and progression.',
          icon: PlayCircle,
          accentColor: 'text-emerald-600',
          confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'ARCHIVED':
        return {
          title: 'Archive Assessment',
          description:
            'Permanently closes the assessment and locks all grading, attempts, and reports to read-only.',
          icon: Archive,
          accentColor: 'text-slate-600',
          confirmBtnClass: 'bg-slate-700 hover:bg-slate-800',
        };
      default:
        return {
          title: `Set Status to ${targetStatus}`,
          description: 'Change assessment lifecycle state.',
          icon: AlertTriangle,
          accentColor: 'text-blue-600',
          confirmBtnClass: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const meta = getStatusMeta();
  const Icon = meta.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('A mandatory justification reason is required for status changes (Rule 7).');
      return;
    }

    if (!confirmed) {
      setError('You must confirm this lifecycle transition before applying.');
      return;
    }

    setError(null);

    try {
      await onSubmit(assessment.id, targetStatus, reason.trim());
      setReason('');
      setConfirmed(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update assessment status.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="assessment-status-modal"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center ${meta.accentColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{meta.title}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Assessment: {assessment.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="close-status-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 text-xs">
          {error && (
            <div
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2"
              data-testid="status-modal-error"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-slate-600">
            <p className="text-slate-800 font-medium">{meta.description}</p>
            <div className="flex justify-between pt-1 border-t border-slate-200/80 text-[11px]">
              <span>
                Current Status:{' '}
                <strong className="font-mono text-slate-900">{assessment.status}</strong>
              </span>
              <span>
                Target Status: <strong className="font-mono text-blue-700">{targetStatus}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mandatory Justification Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Provide a mandatory reason for this status change (e.g. Test session completed; campus network failure investigated; scheduled retirement)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs"
              data-testid="input-status-reason"
            />
            <p className="text-[11px] text-slate-500">
              Per Rule 7, all status overrides and transitions are recorded durably in the audit
              log.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                data-testid="status-confirm-checkbox"
              />
              <span>
                I confirm this status change is authorized and understand the immediate impact on
                candidate testing access.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 ${meta.confirmBtnClass}`}
              data-testid="btn-confirm-status"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm {meta.title}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
