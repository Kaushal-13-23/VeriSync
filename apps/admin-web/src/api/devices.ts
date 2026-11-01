/**
 * Admin Lab Devices API Client
 * Traceability: FR-LAB-001, FR-LAB-002, FR-LAB-003, FR-LAB-004, UC-17, Rule 7
 */

import { apiFetch } from './client';
import {
  LabDeviceRecord,
  RegisterLabDevicePayload,
  UpdateDeviceStatusPayload,
  UpdateDeviceVersionPayload,
  LabDevicesFilterParams,
  LabDevicesResponse,
} from '../types/api';

export const devicesApi = {
  async getDevices(params?: LabDevicesFilterParams): Promise<LabDevicesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      searchParams.set('status', params.status);
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.location && params.location !== 'ALL') {
      searchParams.set('location', params.location);
    }

    const qs = searchParams.toString();
    return apiFetch<LabDevicesResponse>(`/admin/devices${qs ? `?${qs}` : ''}`);
  },

  async getDeviceById(id: string): Promise<LabDeviceRecord> {
    return apiFetch<LabDeviceRecord>(`/admin/devices/${id}`);
  },

  async registerDevice(payload: RegisterLabDevicePayload): Promise<LabDeviceRecord> {
    return apiFetch<LabDeviceRecord>('/admin/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDeviceStatus(
    id: string,
    payload: UpdateDeviceStatusPayload,
  ): Promise<LabDeviceRecord> {
    return apiFetch<LabDeviceRecord>(`/admin/devices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateDeviceVersion(
    id: string,
    payload: UpdateDeviceVersionPayload,
  ): Promise<LabDeviceRecord> {
    return apiFetch<LabDeviceRecord>(`/admin/devices/${id}/version`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
