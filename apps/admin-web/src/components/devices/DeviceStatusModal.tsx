/**
 * Device Status Modification Modal
 * Enforces mandatory justification reason per Rule 7 and BR-012.
 * Traceability: FR-LAB-004, BR-012, Rule 7, NFR-USE-005
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { LabDeviceRecord, DeviceStatus, UpdateDeviceStatusPayload } from '../../types/api';

interface DeviceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: LabDeviceRecord | null;
  onSubmit: (id: string, payload: UpdateDeviceStatusPayload) => Promise<void>;
  isSubmitting: boolean;
}

export const DeviceStatusModal: React.FC<DeviceStatusModalProps> = ({
  isOpen,
  onClose,
  device,
  onSubmit,
  isSubmitting,
}) => {
  const [targetStatus, setTargetStatus] = useState<DeviceStatus>('ACTIVE');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (device) {
      setTargetStatus(device.deviceStatus);
      setReason('');
      setError(null);
    }
  }, [device, isOpen]);

  if (!isOpen || !device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError(
        'Mandatory justification reason (minimum 5 characters) is required for device status modification per BR-012 and Rule 7.',
      );
      return;
    }

    try {
      await onSubmit(device.id, {
        status: targetStatus,
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update device status.');
    }
  };

  const isDestructive = targetStatus === 'BLOCKED' || targetStatus === 'SUSPENDED';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="device-status-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-status-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isDestructive ? 'bg-amber-950' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isDestructive ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-blue-400" aria-hidden="true" />
            )}
            <div>
              <h3 id="device-status-title" className="font-bold text-sm text-white">
                Update Device Status: {device.deviceReference}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">{device.hostname}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            data-testid="close-device-status-btn"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Active Session Warning */}
          {device.activeSessionId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-xs">Active Session Detected</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Candidate <strong>{device.activeCandidateName || 'Enrolled Student'}</strong> is
                  currently taking an examination on this workstation (Session:{' '}
                  <span className="font-mono">{device.activeSessionId}</span>).
                </p>
              </div>
            </div>
          )}

          {/* Current Status vs Target Status */}
          <div>
            <label
              htmlFor="select-device-status"
              className="block font-semibold text-slate-700 mb-1"
            >
              Device Operating Status <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-device-status"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as DeviceStatus)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              data-testid="select-device-status"
            >
              <option value="ACTIVE">ACTIVE - Authorized for examination sessions</option>
              <option value="INACTIVE">INACTIVE - Not currently scheduled</option>
              <option value="SUSPENDED">SUSPENDED - Temporarily taken offline (maintenance)</option>
              <option value="BLOCKED">BLOCKED - Prohibited from candidate logins (security)</option>
            </select>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label
              htmlFor="input-status-reason"
              className="block font-semibold text-slate-700 mb-1"
            >
              Mandatory Justification Reason (Rule 7, BR-012){' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="input-status-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Provide a formal administrative audit justification (e.g. 'Workstation keyboard malfunction during batch 2; replaced with backup unit')."
              className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-rose-400' : 'border-slate-300'
              }`}
              data-testid="input-status-reason"
              aria-required="true"
              aria-invalid={Boolean(error)}
            />
            {error && (
              <p className="text-[11px] text-rose-600 mt-1" data-testid="status-reason-error">
                {error}
              </p>
            )}
          </div>

          {/* Rule Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">
              Non-Negotiable Rule 7 Compliance
            </span>
            <p>
              Status adjustments are permanently recorded into immutable audit logs with timestamp
              (UTC), actor identity, previous status, and the mandatory justification above.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="cancel-status-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                targetStatus === 'BLOCKED'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : targetStatus === 'SUSPENDED'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
              data-testid="submit-status-btn"
            >
              {isSubmitting ? 'Updating...' : `Confirm ${targetStatus}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
