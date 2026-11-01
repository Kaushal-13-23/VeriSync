/**
 * Device Client Version Modification Modal
 * Updates approved client version with mandatory justification reason.
 * Traceability: FR-LAB-003, FR-CONF-001, Rule 7, NFR-USE-005
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Tag } from 'lucide-react';
import { LabDeviceRecord, UpdateDeviceVersionPayload } from '../../types/api';

interface DeviceVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: LabDeviceRecord | null;
  onSubmit: (id: string, payload: UpdateDeviceVersionPayload) => Promise<void>;
  isSubmitting: boolean;
  currentSystemVersion?: string;
}

export const DeviceVersionModal: React.FC<DeviceVersionModalProps> = ({
  isOpen,
  onClose,
  device,
  onSubmit,
  isSubmitting,
  currentSystemVersion = '1.1.0',
}) => {
  const [version, setVersion] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (device) {
      setVersion(device.approvedClientVersion || currentSystemVersion);
      setReason('');
      setError(null);
    }
  }, [device, isOpen, currentSystemVersion]);

  if (!isOpen || !device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim()) {
      setError('Approved client version string is required (e.g. 1.1.0).');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError(
        'Mandatory justification reason (minimum 5 characters) is required for version modification per Rule 7.',
      );
      return;
    }

    try {
      await onSubmit(device.id, {
        approvedClientVersion: version.trim(),
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update approved client version.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="device-version-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-version-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Tag className="w-5 h-5 text-blue-400" aria-hidden="true" />
            <div>
              <h3 id="device-version-title" className="font-bold text-sm text-white">
                Update Client Version: {device.deviceReference}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">{device.hostname}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            data-testid="close-device-version-btn"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label
              htmlFor="input-approved-version"
              className="block font-semibold text-slate-700 mb-1"
            >
              Approved Client Version <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="input-approved-version"
                type="text"
                value={version}
                onChange={(e) => {
                  setVersion(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 1.1.0"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                data-testid="input-approved-version"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setVersion(currentSystemVersion)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium whitespace-nowrap text-[11px] border border-slate-300"
                title={`Set to system current version (${currentSystemVersion})`}
              >
                Use Latest ({currentSystemVersion})
              </button>
            </div>
          </div>

          {/* Mandatory Reason */}
          <div>
            <label
              htmlFor="input-version-reason"
              className="block font-semibold text-slate-700 mb-1"
            >
              Mandatory Justification Reason (Rule 7) <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="input-version-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 'Upgraded candidate desktop binary to v1.1.0 following patch deployment.'"
              className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-rose-400' : 'border-slate-300'
              }`}
              data-testid="input-version-reason"
              aria-required="true"
              aria-invalid={Boolean(error)}
            />
            {error && (
              <p className="text-[11px] text-rose-600 mt-1" data-testid="version-reason-error">
                {error}
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Per <strong>FR-LAB-003</strong> and <strong>FR-CONF-001</strong>, candidate clients
              with an unapproved version are rejected with HTTP 426 (Upgrade Required).
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="cancel-version-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="submit-version-btn"
            >
              {isSubmitting ? 'Saving...' : 'Update Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
