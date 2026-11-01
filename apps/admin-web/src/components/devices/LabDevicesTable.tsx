/**
 * Lab Devices Table Component
 * Tabular roster with status indicators, version check, and administrative actions.
 * Traceability: FR-LAB-001, FR-LAB-003, FR-LAB-004, UC-17, Rule 9, NFR-USE-005
 */

import React from 'react';
import {
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  MapPin,
  Tag,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { LabDeviceRecord, DeviceStatus } from '../../types/api';

interface LabDevicesTableProps {
  devices: LabDeviceRecord[];
  isLoading: boolean;
  latestSystemVersion: string;
  onOpenStatusModal: (device: LabDeviceRecord) => void;
  onOpenVersionModal: (device: LabDeviceRecord) => void;
}

export const LabDevicesTable: React.FC<LabDevicesTableProps> = ({
  devices,
  isLoading,
  latestSystemVersion,
  onOpenStatusModal,
  onOpenVersionModal,
}) => {
  const getStatusBadge = (status: DeviceStatus, reason?: string, deviceId?: string) => {
    const testId = deviceId ? `status-badge-${deviceId}` : `status-badge-${status.toLowerCase()}`;
    switch (status) {
      case 'ACTIVE':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            data-testid={testId}
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ACTIVE</span>
          </span>
        );
      case 'SUSPENDED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
            title={reason || 'Device suspended'}
            data-testid={testId}
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>SUSPENDED</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
            title={reason || 'Device blocked'}
            data-testid={testId}
          >
            <Ban className="w-3.5 h-3.5" aria-hidden="true" />
            <span>BLOCKED</span>
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"
            data-testid={testId}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>INACTIVE</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div
        className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
        data-testid="lab-devices-loading"
        aria-busy="true"
      >
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Loading lab devices registry...</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div
        className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
        data-testid="no-devices-found"
      >
        <Laptop className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
        <h4 className="text-base font-semibold text-slate-800">No Lab Devices Found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No registered workstations match your active search filters. Adjust filters or register a new
          lab computer.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      data-testid="lab-devices-table-container"
    >
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse text-xs"
          data-testid="lab-devices-table"
          aria-label="Authorized Lab Devices Registry"
        >
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th scope="col" className="px-5 py-3.5">
                Device Reference & Hostname
              </th>
              <th scope="col" className="px-4 py-3.5">
                Network (IP / MAC)
              </th>
              <th scope="col" className="px-4 py-3.5">
                Location
              </th>
              <th scope="col" className="px-4 py-3.5">
                Client Version
              </th>
              <th scope="col" className="px-4 py-3.5">
                Operating Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Last Seen (UTC)
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map((device) => {
              const isOutdated = device.approvedClientVersion !== latestSystemVersion;

              return (
                <tr
                  key={device.id}
                  className="hover:bg-slate-50/70 transition-colors"
                  data-testid={`row-device-${device.id}`}
                >
                  {/* Device Reference & Hostname */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                        <Laptop className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block font-mono">
                          {device.deviceReference}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {device.hostname}
                        </span>
                        {device.activeSessionId && (
                          <span className="inline-block mt-0.5 text-[10px] text-blue-600 font-medium">
                            In session: {device.activeCandidateName || device.activeSessionId}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Network IP & MAC */}
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5 font-mono">
                      <span className="font-medium text-slate-800 block">{device.ipAddress}</span>
                      <span className="text-[11px] text-slate-500 block">{device.macAddress}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="font-medium">{device.location}</span>
                    </div>
                  </td>

                  {/* Client Version */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-medium px-2 py-0.5 rounded text-[11px] ${
                          isOutdated
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                        data-testid={`version-badge-${device.id}`}
                      >
                        v{device.approvedClientVersion}
                      </span>
                      {isOutdated && (
                        <span
                          className="text-amber-700 font-medium flex items-center gap-0.5 text-[10px]"
                          title={`Outdated client version (System current: v${latestSystemVersion})`}
                          data-testid={`outdated-warning-${device.id}`}
                        >
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
                          <span>Outdated</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Operating Status */}
                  <td className="px-4 py-3.5">
                    <div>
                      {getStatusBadge(device.deviceStatus, device.statusReason, device.id)}
                      {device.statusReason && (
                        <p
                          className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate"
                          title={device.statusReason}
                        >
                          {device.statusReason}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Last Seen (UTC) */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{new Date(device.lastSeenAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal(device)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-300 rounded-lg transition-colors inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                        data-testid={`btn-status-${device.id}`}
                        aria-label={`Update status for ${device.deviceReference}`}
                      >
                        <Sliders className="w-3 h-3 text-slate-500" aria-hidden="true" />
                        <span>Status</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenVersionModal(device)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 border border-slate-300 rounded-lg transition-colors inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                        data-testid={`btn-version-${device.id}`}
                        aria-label={`Update client version for ${device.deviceReference}`}
                      >
                        <Tag className="w-3 h-3 text-slate-500" aria-hidden="true" />
                        <span>Version</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
