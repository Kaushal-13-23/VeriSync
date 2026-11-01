/**
 * Register Lab Device Modal
 * Traceability: FR-LAB-001, FR-LAB-002, UC-17, Rule 6, NFR-USE-005
 */

import React, { useState } from 'react';
import { X, Laptop, ShieldCheck } from 'lucide-react';
import { RegisterLabDevicePayload } from '../../types/api';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RegisterLabDevicePayload) => Promise<void>;
  isSubmitting: boolean;
  defaultVersion?: string;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  defaultVersion = '1.1.0',
}) => {
  const [formData, setFormData] = useState<RegisterLabDevicePayload>({
    deviceReference: '',
    hostname: '',
    ipAddress: '',
    macAddress: '',
    location: '',
    approvedClientVersion: defaultVersion,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.deviceReference.trim()) {
      errs.deviceReference = 'Device Reference identifier is required (e.g. LAB-PC-101).';
    }
    if (!formData.hostname.trim()) {
      errs.hostname = 'Terminal Hostname is required.';
    }
    if (!formData.ipAddress.trim()) {
      errs.ipAddress = 'Static IP Address is required.';
    } else if (
      !/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        formData.ipAddress.trim(),
      )
    ) {
      errs.ipAddress = 'Please enter a valid IPv4 address (e.g. 192.168.10.101).';
    }
    if (!formData.macAddress.trim()) {
      errs.macAddress = 'Hardware MAC Address is required.';
    } else if (
      !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(formData.macAddress.trim())
    ) {
      errs.macAddress = 'Format must be XX:XX:XX:XX:XX:XX (e.g. 00:1B:44:11:3A:B7).';
    }
    if (!formData.location.trim()) {
      errs.location = 'Physical lab room & location is required.';
    }
    if (!formData.approvedClientVersion.trim()) {
      errs.approvedClientVersion = 'Approved client version is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="register-device-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-device-title"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Laptop className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="register-device-title" className="font-bold text-base text-white">
                Register Authorized Lab Device
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Enroll lab computer into secure registry (FR-LAB-001, UC-17).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            data-testid="close-register-device-btn"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Device Reference */}
            <div>
              <label
                htmlFor="input-device-reference"
                className="block font-semibold text-slate-700 mb-1"
              >
                Device Reference <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-reference"
                type="text"
                value={formData.deviceReference}
                onChange={(e) =>
                  setFormData({ ...formData, deviceReference: e.target.value.toUpperCase() })
                }
                placeholder="e.g. LAB-PC-106"
                className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.deviceReference ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-device-reference"
                aria-required="true"
                aria-invalid={Boolean(errors.deviceReference)}
              />
              {errors.deviceReference && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.deviceReference}</p>
              )}
            </div>

            {/* Approved Client Version */}
            <div>
              <label
                htmlFor="input-device-version"
                className="block font-semibold text-slate-700 mb-1"
              >
                Approved Client Version <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-version"
                type="text"
                value={formData.approvedClientVersion}
                onChange={(e) =>
                  setFormData({ ...formData, approvedClientVersion: e.target.value })
                }
                placeholder="e.g. 1.1.0"
                className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.approvedClientVersion ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-device-version"
                aria-required="true"
                aria-invalid={Boolean(errors.approvedClientVersion)}
              />
              {errors.approvedClientVersion && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.approvedClientVersion}</p>
              )}
            </div>

            {/* Hostname */}
            <div>
              <label htmlFor="input-device-hostname" className="block font-semibold text-slate-700 mb-1">
                Terminal Hostname <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-hostname"
                type="text"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                placeholder="e.g. lab3-ws-06.internal"
                className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.hostname ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-device-hostname"
                aria-required="true"
                aria-invalid={Boolean(errors.hostname)}
              />
              {errors.hostname && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.hostname}</p>
              )}
            </div>

            {/* IP Address */}
            <div>
              <label htmlFor="input-device-ip" className="block font-semibold text-slate-700 mb-1">
                Static IP Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-ip"
                type="text"
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="e.g. 192.168.10.106"
                className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                  errors.ipAddress ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-device-ip"
                aria-required="true"
                aria-invalid={Boolean(errors.ipAddress)}
              />
              {errors.ipAddress && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.ipAddress}</p>
              )}
            </div>

            {/* MAC Address */}
            <div>
              <label htmlFor="input-device-mac" className="block font-semibold text-slate-700 mb-1">
                Hardware MAC Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-mac"
                type="text"
                value={formData.macAddress}
                onChange={(e) =>
                  setFormData({ ...formData, macAddress: e.target.value.toUpperCase() })
                }
                placeholder="e.g. 00:1B:44:11:3A:E1"
                className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                  errors.macAddress ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-device-mac"
                aria-required="true"
                aria-invalid={Boolean(errors.macAddress)}
              />
              {errors.macAddress && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.macAddress}</p>
              )}
            </div>

            {/* Physical Location */}
            <div>
              <label htmlFor="input-device-location" className="block font-semibold text-slate-700 mb-1">
                Physical Location <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Lab 3 - Block B"
                className={`w-full px-3 py-2 text-xs border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.location ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-device-location"
                aria-required="true"
                aria-invalid={Boolean(errors.location)}
              />
              {errors.location && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.location}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="input-device-notes" className="block font-semibold text-slate-700 mb-1">
              Terminal Hardware & Provisioning Notes
            </label>
            <textarea
              id="input-device-notes"
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Workstation model, OS build 19045, single display configured."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-device-notes"
            />
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-blue-800">
              Per <strong>FR-LAB-002</strong>, device authentication binds the unique managed identifier
              and approved client version. Only registered workstations can initialize candidate assessment sessions.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="cancel-register-device-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="submit-register-device-btn"
            >
              {isSubmitting ? 'Registering...' : 'Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
