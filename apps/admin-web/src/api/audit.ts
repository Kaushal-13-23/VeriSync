/**
 * Audit Logs & Incident Reports API Client
 * Traceability: FR-ADMIN-007, FR-ADMIN-008, SRS 11.4, Rule 7, Rule 9
 */

import { apiFetch } from './client';
import { AuditLogFilterParams, GetAuditLogsResponse, IncidentRecord } from '../types/api';

export const auditApi = {
  async getAuditLogs(params?: AuditLogFilterParams): Promise<GetAuditLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.eventType && params.eventType !== 'ALL')
      searchParams.set('eventType', params.eventType);
    if (params?.actor) searchParams.set('actor', params.actor);
    if (params?.entityType && params.entityType !== 'ALL')
      searchParams.set('entityType', params.entityType);
    if (params?.outcome && params.outcome !== 'ALL') searchParams.set('outcome', params.outcome);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.correlationId) searchParams.set('correlationId', params.correlationId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return apiFetch<GetAuditLogsResponse>(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },

  async getIncidents(): Promise<IncidentRecord[]> {
    return apiFetch<IncidentRecord[]>('/admin/incidents');
  },

  async exportAuditLogsCsv(params?: AuditLogFilterParams): Promise<string> {
    const res = await this.getAuditLogs({ ...params, limit: 1000 });
    const header =
      'Timestamp,Event,Actor,Role,Entity,EntityID,Outcome,Reason,CorrelationID,IPAddress\n';
    const rows = res.entries
      .map(
        (e) =>
          `"${e.timestamp}","${e.eventType}","${e.actorName}","${e.actorRole}","${e.entityType}","${e.entityId}","${e.outcome}","${(e.reason || '').replace(/"/g, '""')}","${e.correlationId}","${e.ipAddress}"`,
      )
      .join('\n');
    return header + rows;
  },
};
