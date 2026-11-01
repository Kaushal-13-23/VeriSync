/**
 * Admin Security Settings & MFA Policies API Client
 * Traceability: FR-AUTH-007, FR-AUTH-008, NFR-SEC-004, FR-CONF-001, Rule 7
 */

import { apiFetch } from './client';
import {
  SecuritySettingsPolicies,
  UpdateSecurityPoliciesPayload,
  MfaEnrollmentResponse,
  MfaSetupConfirmPayload,
  AuthUser,
} from '../types/api';

export const securityApi = {
  async getSecurityPolicies(): Promise<SecuritySettingsPolicies> {
    return apiFetch<SecuritySettingsPolicies>('/admin/security/policies');
  },

  async updateSecurityPolicies(
    payload: UpdateSecurityPoliciesPayload,
  ): Promise<SecuritySettingsPolicies> {
    return apiFetch<SecuritySettingsPolicies>('/admin/security/policies', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async initMfaSetup(): Promise<MfaEnrollmentResponse> {
    return apiFetch<MfaEnrollmentResponse>('/admin/auth/mfa/setup-init', {
      method: 'POST',
    });
  },

  async confirmMfaSetup(
    payload: MfaSetupConfirmPayload,
  ): Promise<{ success: boolean; user: AuthUser; message: string }> {
    return apiFetch<{ success: boolean; user: AuthUser; message: string }>(
      '/admin/auth/mfa/setup-confirm',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async verifyAuditChain(): Promise<{
    valid: boolean;
    totalEntries: number;
    verifiedAt: string;
    hashAlgorithm: string;
  }> {
    return apiFetch<{
      valid: boolean;
      totalEntries: number;
      verifiedAt: string;
      hashAlgorithm: string;
    }>('/admin/security/verify-audit-chain');
  },
};
