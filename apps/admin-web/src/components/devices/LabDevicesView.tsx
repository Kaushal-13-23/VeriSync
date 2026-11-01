/**
 * Lab Devices Management View (UC-17)
 * Registers, activates/deactivates/blocks devices, manages approved versions, and tracks last seen.
 * Traceability: FR-LAB-001, FR-LAB-002, FR-LAB-003, FR-LAB-004, UC-17, BR-012, Rule 7, Rule 9, NFR-USE-005
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Laptop,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  Filter,
} from 'lucide-react';
import { devicesApi } from '../../api/devices';
import { securityApi } from '../../api/security';
import {
  LabDeviceRecord,
  RegisterLabDevicePayload,
  UpdateDeviceStatusPayload,
  UpdateDeviceVersionPayload,
} from '../../types/api';
import { LabDevicesTable } from './LabDevicesTable';
import { RegisterDeviceModal } from './RegisterDeviceModal';
import { DeviceStatusModal } from './DeviceStatusModal';
import { DeviceVersionModal } from './DeviceVersionModal';
import { toastManager } from '../../lib/toast';

export const LabDevicesView: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [selectedStatusDevice, setSelectedStatusDevice] = useState<LabDeviceRecord | null>(null);
  const [selectedVersionDevice, setSelectedVersionDevice] = useState<LabDeviceRecord | null>(null);

  // Fetch security policies to know current approved client version
  const { data: policies } = useQuery({
    queryKey: ['security-policies'],
    queryFn: () => securityApi.getSecurityPolicies(),
  });
  const currentSystemVersion = policies?.approvedClientVersion || '1.1.0';

  // Fetch lab devices
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['lab-devices', { status: statusFilter, search, location: locationFilter }],
    queryFn: () =>
      devicesApi.getDevices({
        status: statusFilter,
        search: search || undefined,
        location: locationFilter !== 'ALL' ? locationFilter : undefined,
      }),
  });

  const devices = data?.devices || [];
  const stats = data?.stats || {
    total: 0,
    activeCount: 0,
    suspendedCount: 0,
    blockedCount: 0,
    outdatedVersionCount: 0,
  };

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (payload: RegisterLabDevicePayload) => devicesApi.registerDevice(payload),
    onSuccess: (newDev) => {
      queryClient.invalidateQueries({ queryKey: ['lab-devices'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toastManager.show({
        type: 'success',
        title: 'Device Registered',
        message: `Lab workstation '${newDev.deviceReference}' (${newDev.hostname}) enrolled into authorized registry.`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Registration Rejected',
        message: err.message || 'Failed to register lab workstation.',
      });
    },
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeviceStatusPayload }) =>
      devicesApi.updateDeviceStatus(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['lab-devices'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toastManager.show({
        type: 'success',
        title: 'Status Updated',
        message: `Device '${updated.deviceReference}' set to ${updated.deviceStatus}.`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Failed to update device status.',
      });
    },
  });

  // Update version mutation
  const versionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeviceVersionPayload }) =>
      devicesApi.updateDeviceVersion(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['lab-devices'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toastManager.show({
        type: 'success',
        title: 'Version Updated',
        message: `Device '${updated.deviceReference}' approved version set to v${updated.approvedClientVersion}.`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Version Update Failed',
        message: err.message || 'Failed to update device version.',
      });
    },
  });

  // Unique locations for filter
  const locations = React.useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => {
      if (d.location) set.add(d.location);
    });
    return Array.from(set);
  }, [devices]);

  return (
    <div className="space-y-6" data-testid="lab-devices-view">
      {/* Header & Registration Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Laptop className="w-6 h-6 text-blue-600" aria-hidden="true" />
            <span>Authorized Lab Devices Registry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical computer authorizations, client versions, and operating states (UC-17,
            FR-LAB-001..004).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            title="Refresh devices roster"
            aria-label="Refresh devices roster"
            data-testid="refresh-devices-btn"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-600' : ''}`}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            data-testid="btn-register-device"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Register Lab Device</span>
          </button>
        </div>
      </div>

      {/* 5 Key Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="devices-stat-cards">
        {/* Total Devices */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Total Registered</span>
            <Laptop className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono" data-testid="stat-total-devices">
            {stats.total}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Managed Lab Workstations</span>
        </div>

        {/* Active Authorized */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-semibold uppercase">
            <span>Active Authorized</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p
            className="text-2xl font-bold text-emerald-700 mt-2 font-mono"
            data-testid="stat-active-devices"
          >
            {stats.activeCount}
          </p>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Ready for Examination</span>
        </div>

        {/* Suspended (Maintenance) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-[11px] font-semibold uppercase">
            <span>Suspended</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <p
            className="text-2xl font-bold text-amber-700 mt-2 font-mono"
            data-testid="stat-suspended-devices"
          >
            {stats.suspendedCount}
          </p>
          <span className="text-[11px] text-amber-600/80 mt-0.5 block">Hardware Maintenance</span>
        </div>

        {/* Blocked (Security Prohibited) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-[11px] font-semibold uppercase">
            <span>Blocked</span>
            <Ban className="w-4 h-4 text-rose-600" aria-hidden="true" />
          </div>
          <p
            className="text-2xl font-bold text-rose-700 mt-2 font-mono"
            data-testid="stat-blocked-devices"
          >
            {stats.blockedCount}
          </p>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">Security Prohibited</span>
        </div>

        {/* Outdated Client Version */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-700 text-[11px] font-semibold uppercase">
            <span>Outdated Version</span>
            <Clock className="w-4 h-4 text-purple-600" aria-hidden="true" />
          </div>
          <p
            className="text-2xl font-bold text-purple-700 mt-2 font-mono"
            data-testid="stat-outdated-devices"
          >
            {stats.outdatedVersionCount}
          </p>
          <span className="text-[11px] text-purple-600/80 mt-0.5 block">
            Requires v{currentSystemVersion}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, hostname, IP, location..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            data-testid="input-search-devices"
            aria-label="Search lab devices"
          />
        </div>

        {/* Status and Location Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
            data-testid="select-filter-status"
            aria-label="Filter by operating status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Authorized</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BLOCKED">Blocked</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {locations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
              data-testid="select-filter-location"
              aria-label="Filter by lab location"
            >
              <option value="ALL">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lab Devices Table */}
      <LabDevicesTable
        devices={devices}
        isLoading={isLoading}
        latestSystemVersion={currentSystemVersion}
        onOpenStatusModal={(dev) => setSelectedStatusDevice(dev)}
        onOpenVersionModal={(dev) => setSelectedVersionDevice(dev)}
      />

      {/* Register Device Modal */}
      <RegisterDeviceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmit={async (payload) => {
          await registerMutation.mutateAsync(payload);
        }}
        isSubmitting={registerMutation.isPending}
        defaultVersion={currentSystemVersion}
      />

      {/* Device Status Modal */}
      <DeviceStatusModal
        isOpen={Boolean(selectedStatusDevice)}
        onClose={() => setSelectedStatusDevice(null)}
        device={selectedStatusDevice}
        onSubmit={async (id, payload) => {
          await statusMutation.mutateAsync({ id, payload });
        }}
        isSubmitting={statusMutation.isPending}
      />

      {/* Device Version Modal */}
      <DeviceVersionModal
        isOpen={Boolean(selectedVersionDevice)}
        onClose={() => setSelectedVersionDevice(null)}
        device={selectedVersionDevice}
        onSubmit={async (id, payload) => {
          await versionMutation.mutateAsync({ id, payload });
        }}
        isSubmitting={versionMutation.isPending}
        currentSystemVersion={currentSystemVersion}
      />
    </div>
  );
};
