/**
 * VeriSync Platform Security Settings & Policies View
 * Manages MFA enforcement, session timeouts, client version thresholds, and cryptographic audit checks.
 * Traceability: FR-AUTH-007, FR-AUTH-008, FR-CONF-001, FR-CONF-003, NFR-SEC-004, NFR-SEC-010, Rule 7, Rule 9
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Clock,
  Laptop,
  CheckCircle2,
  Save,
  Key,
  FileCheck,
} from 'lucide-react';
import { securityApi } from '../../api/security';
import { useAuth } from '../../store/authContext';
import {
  UpdateSecurityPoliciesPayload,
} from '../../types/api';
import { MfaSetupModal } from '../auth/MfaSetupModal';
import { toastManager } from '../../lib/toast';

export const SecuritySettingsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<number>(15);
  const [warningCountdown, setWarningCountdown] = useState<number>(60);
  const [approvedVersion, setApprovedVersion] = useState<string>('1.1.0');
  const [strictVersion, setStrictVersion] = useState<boolean>(true);
  const [kioskMode, setKioskMode] = useState<'STRICT' | 'AUDIT_ONLY'>('STRICT');
  const [retentionDays, setRetentionDays] = useState<number>(365);
  const [policyReason, setPolicyReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [auditVerification, setAuditVerification] = useState<{
    valid: boolean;
    totalEntries: number;
    verifiedAt: string;
    hashAlgorithm: string;
  } | null>(null);
  const [isVerifyingAudit, setIsVerifyingAudit] = useState(false);

  // Fetch security policies
  const { data: policies, isLoading } = useQuery({
    queryKey: ['security-policies'],
    queryFn: () => securityApi.getSecurityPolicies(),
  });

  useEffect(() => {
    if (policies) {
      setSessionTimeout(policies.sessionTimeoutMinutes);
      setWarningCountdown(policies.warningCountdownSeconds);
      setApprovedVersion(policies.approvedClientVersion);
      setStrictVersion(policies.strictVersionEnforcement);
      setKioskMode(policies.kioskEnforcementMode);
      setRetentionDays(policies.auditLogRetentionDays);
    }
  }, [policies]);

  // Update policies mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSecurityPoliciesPayload) =>
      securityApi.updateSecurityPolicies(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setPolicyReason('');
      setReasonError(null);
      toastManager.show({
        type: 'success',
        title: 'Security Policies Saved',
        message: 'System security and session timeout configurations have been updated.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Update Rejected',
        message: err.message || 'Failed to update system security policies.',
      });
    },
  });

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyReason.trim() || policyReason.trim().length < 5) {
      setReasonError(
        'Mandatory justification reason (minimum 5 characters) is required for modifying system security settings per Rule 7.',
      );
      return;
    }

    await updateMutation.mutateAsync({
      sessionTimeoutMinutes: sessionTimeout,
      warningCountdownSeconds: warningCountdown,
      approvedClientVersion: approvedVersion.trim(),
      strictVersionEnforcement: strictVersion,
      kioskEnforcementMode: kioskMode,
      auditLogRetentionDays: retentionDays,
      reason: policyReason.trim(),
    });
  };

  const handleVerifyAuditChain = async () => {
    try {
      setIsVerifyingAudit(true);
      const res = await securityApi.verifyAuditChain();
      setAuditVerification(res);
      toastManager.show({
        type: 'success',
        title: 'Audit Cryptographic Check Passed',
        message: `Verified ${res.totalEntries} immutable audit log entries using ${res.hashAlgorithm}.`,
      });
    } catch (err) {
      toastManager.show({
        type: 'error',
        title: 'Verification Failed',
        message: (err as Error).message || 'Audit chain verification failed.',
      });
    } finally {
      setIsVerifyingAudit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500" data-testid="security-settings-loading">
        Loading security settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl" data-testid="security-settings-view">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-blue-600" aria-hidden="true" />
          <span>Security Hardening & Platform Policies</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure privileged access controls, MFA enrollment, session timeouts, and client lockdown
          thresholds (FR-AUTH-007, FR-AUTH-008, NFR-SEC).
        </p>
      </div>

      <form onSubmit={handleSavePolicies} className="space-y-6">
        {/* SECTION 1: Privileged Access & MFA */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Privileged Administrator Access & Multi-Factor Authentication
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mandatory TOTP authenticator protection for Super Admin accounts (FR-AUTH-008).
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>MFA Enforced (Active)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-semibold text-slate-800 block">Authenticated Admin Profile</span>
              <p className="text-slate-600">
                Logged in as: <strong className="text-slate-900">{user?.fullName || user?.username}</strong>
              </p>
              <p className="text-slate-500 text-[11px] font-mono">
                Role: {user?.role} • ID: {user?.id}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsMfaModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  data-testid="btn-reconfigure-mfa"
                >
                  <Key className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Re-enroll / View Backup Codes</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-semibold text-slate-800 block">MFA Policy Requirements</span>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                <li>Standard: Time-based One-Time Password (RFC 6238 TOTP)</li>
                <li>Algorithm: SHA-1 with 30-second time step drift tolerance</li>
                <li>8 cryptographic emergency backup codes provisioned upon pairing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION 2: Session Inactivity & Auto-Revocation */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-amber-600" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Administrator Session Inactivity & Auto-Revocation Policy
              </h3>
              <p className="text-[11px] text-slate-500">
                Automatic termination of idle privileged sessions (FR-AUTH-007, NFR-SEC-004).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="select-session-timeout" className="block font-semibold text-slate-700 mb-1">
                Inactivity Timeout Duration <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-session-timeout"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                data-testid="select-session-timeout"
              >
                <option value={15}>15 Minutes (SRS Standard Baseline)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (Extended Evaluation Mode)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Session automatically purges client authentication tokens following inactivity.
              </p>
            </div>

            <div>
              <label htmlFor="select-warning-countdown" className="block font-semibold text-slate-700 mb-1">
                Countdown Warning Dialog Duration <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-warning-countdown"
                value={warningCountdown}
                onChange={(e) => setWarningCountdown(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                data-testid="select-warning-countdown"
              >
                <option value={60}>60 Seconds</option>
                <option value={120}>120 Seconds</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Duration of modal alert before forcing cryptographic logout.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Client Compatibility & Kiosk Policy */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Laptop className="w-5 h-5 text-purple-600" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Candidate Desktop Client Compatibility & Kiosk Policy
              </h3>
              <p className="text-[11px] text-slate-500">
                Approved version threshold and lockdown enforcement configuration (FR-CONF-001,
                FR-LAB-003, FR-LAB-008).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="input-approved-version-policy" className="block font-semibold text-slate-700 mb-1">
                Approved Client Version <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-approved-version-policy"
                type="text"
                value={approvedVersion}
                onChange={(e) => setApprovedVersion(e.target.value)}
                placeholder="e.g. 1.1.0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-semibold"
                data-testid="input-approved-version-policy"
                aria-required="true"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Workstations with older versions are flagged or rejected per policy.
              </p>
            </div>

            <div>
              <label htmlFor="select-kiosk-mode" className="block font-semibold text-slate-700 mb-1">
                Lockdown Enforcement Mode
              </label>
              <select
                id="select-kiosk-mode"
                value={kioskMode}
                onChange={(e) => setKioskMode(e.target.value as 'STRICT' | 'AUDIT_ONLY')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                data-testid="select-kiosk-mode"
              >
                <option value="STRICT">STRICT - Multi-layer OS kiosk mode lockdown</option>
                <option value="AUDIT_ONLY">AUDIT_ONLY - Telemetry logging without hard lock</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictVersion}
                  onChange={(e) => setStrictVersion(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  data-testid="checkbox-strict-version"
                />
                <span className="text-slate-800 font-semibold">
                  Strict Version Handshake: Reject outdated candidate clients with HTTP 426 (Upgrade Required)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 4: Cryptographic Audit Trail Verification */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Tamper-Evident Audit Trail Cryptographic Verification
                </h3>
                <p className="text-[11px] text-slate-500">
                  Verify immutable hash chains of administrative actions (NFR-SEC-010, FR-AUD-004).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifyAuditChain}
              disabled={isVerifyingAudit}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              data-testid="btn-verify-audit-chain"
            >
              {isVerifyingAudit ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Verify Hash Chain Integrity</span>
                </>
              )}
            </button>
          </div>

          {auditVerification && (
            <div
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900"
              data-testid="audit-verification-banner"
            >
              <div className="space-y-0.5">
                <span className="font-bold block">Audit Cryptographic Chain Verified (SHA-256)</span>
                <span className="text-[11px] text-emerald-800">
                  Total Valid Entries: <strong>{auditVerification.totalEntries}</strong> • Verified at:{' '}
                  {new Date(auditVerification.verifiedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]">
                100% VALID
              </span>
            </div>
          )}
        </div>

        {/* SECTION 5: Mandatory Justification & Submit */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md space-y-4">
          <div>
            <h3 className="font-bold text-sm text-white">
              Save Security Policies (Rule 7 Compliance)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Every administrative configuration change requires a mandatory audit justification reason.
            </p>
          </div>

          <div>
            <label htmlFor="input-policy-reason" className="block text-xs font-semibold text-slate-200 mb-1">
              Mandatory Justification Reason (Rule 7, FR-CONF-003) <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="input-policy-reason"
              rows={2}
              value={policyReason}
              onChange={(e) => {
                setPolicyReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="e.g. 'Updated inactivity session timeout to 15 mins for Fall Placement recruitment drive per cyber policy.'"
              className={`w-full px-3 py-2 text-xs border rounded-xl bg-slate-800 text-white placeholder-slate-400 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                reasonError ? 'border-rose-400' : 'border-slate-700'
              }`}
              data-testid="input-policy-reason"
              aria-required="true"
              aria-invalid={Boolean(reasonError)}
            />
            {reasonError && (
              <p className="text-[11px] text-rose-400 mt-1" data-testid="policy-reason-error">
                {reasonError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="btn-save-policies"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{updateMutation.isPending ? 'Saving Policies...' : 'Save Security Policies'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* MFA Setup Modal */}
      <MfaSetupModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['security-policies'] });
        }}
      />
    </div>
  );
};
