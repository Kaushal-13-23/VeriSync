/**
 * Administrator MFA Setup & Enrollment Modal
 * Guides privileged administrators through TOTP authenticator pairing and emergency backup codes.
 * Traceability: FR-AUTH-008, UC-01, Rule 5, NFR-USE-005
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Download,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { securityApi } from '../../api/security';
import { MfaEnrollmentResponse, AuthUser } from '../../types/api';
import { toastManager } from '../../lib/toast';

interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
  enforceEnrollment?: boolean;
}

export const MfaSetupModal: React.FC<MfaSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  enforceEnrollment = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enrollmentData, setEnrollmentData] = useState<MfaEnrollmentResponse | null>(null);

  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);
  const [confirmedBackupSaved, setConfirmedBackupSaved] = useState<boolean>(false);

  const [verifyCode, setVerifyCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize enrollment on open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoading(true);
    setStep(1);
    setError(null);
    setVerifyCode('');
    setConfirmedBackupSaved(false);

    securityApi
      .initMfaSetup()
      .then((data) => {
        if (mounted) {
          setEnrollmentData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to initialize MFA setup.');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (!enrollmentData?.secretKey) return;
    navigator.clipboard.writeText(enrollmentData.secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCodes = () => {
    if (!enrollmentData?.backupCodes) return;
    navigator.clipboard.writeText(enrollmentData.backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (!enrollmentData?.backupCodes) return;
    const content = `VeriSync Administrator Emergency Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${enrollmentData.backupCodes.join('\n')}\n\nKeep these codes in a secure offline vault.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verisync-admin-mfa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code from your authenticator app.');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const result = await securityApi.confirmMfaSetup({
        secretKey: enrollmentData!.secretKey,
        code: verifyCode.trim(),
        backupCodes: enrollmentData!.backupCodes,
      });

      toastManager.show({
        type: 'success',
        title: 'MFA Enabled',
        message: 'Two-factor TOTP authentication has been successfully configured.',
      });

      if (onSuccess) {
        onSuccess(result.user);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mfa-setup-title"
      data-testid="mfa-setup-modal"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="mfa-setup-title" className="font-bold text-sm text-white">
                Configure Multi-Factor Authentication (MFA)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Mandatory privileged administrator access control (FR-AUTH-008).
              </p>
            </div>
          </div>

          {!enforceEnrollment && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              data-testid="close-mfa-setup-btn"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wizard Step Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
              Authenticator App
            </span>
          </div>

          <span className="text-slate-300">→</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
              Backup Codes
            </span>
          </div>

          <span className="text-slate-300">→</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
              Verify
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-xs space-y-4">
          {isLoading ? (
            <div className="p-12 text-center space-y-3" data-testid="mfa-setup-loading">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 font-medium">Generating cryptographic MFA secret...</p>
            </div>
          ) : error && !enrollmentData ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <p className="font-semibold">Failed to initialize MFA setup</p>
              <p className="text-[11px] mt-1">{error}</p>
            </div>
          ) : (
            <>
              {/* STEP 1: Scan QR / Secret Key */}
              {step === 1 && (
                <div className="space-y-4" data-testid="mfa-step-1">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                    Install an authenticator app such as <strong>Google Authenticator</strong>,{' '}
                    <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your mobile
                    device, then scan the QR code or enter the secret key manually.
                  </div>

                  {/* QR Simulation Box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-center">
                    <div className="w-32 h-32 bg-white border-2 border-slate-300 rounded-xl flex items-center justify-center shadow-xs shrink-0 p-2 text-center">
                      <div className="space-y-1">
                        <QrCode className="w-16 h-16 text-slate-800 mx-auto" aria-hidden="true" />
                        <span className="text-[9px] font-mono text-slate-500 block uppercase">
                          TOTP QR
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-left w-full">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        Manual Entry Secret Key:
                      </span>
                      <div className="flex items-center gap-2">
                        <code
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-blue-700 select-all tracking-wider"
                          data-testid="mfa-secret-key"
                        >
                          {enrollmentData?.secretKey}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                          title="Copy secret key"
                          data-testid="btn-copy-mfa-key"
                        >
                          {copiedKey ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Algorithm: SHA-1 • Period: 30 seconds • Digits: 6
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      data-testid="btn-step-1-next"
                    >
                      <span>Next: Backup Codes</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Backup Codes */}
              {step === 2 && (
                <div className="space-y-4" data-testid="mfa-step-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Store these emergency recovery codes safely.</strong> If you lose access to
                      your authenticator device, each code can be used once to recover administrator access.
                    </p>
                  </div>

                  {/* 8 Backup Codes Grid */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center font-bold text-slate-800 text-xs">
                      {enrollmentData?.backupCodes.map((code, idx) => (
                        <div
                          key={code}
                          className="p-2 bg-white border border-slate-200 rounded-lg shadow-2xs"
                          data-testid={`backup-code-${idx}`}
                        >
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleCopyCodes}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium text-[11px]"
                        data-testid="btn-copy-backup-codes"
                      >
                        {copiedCodes ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedCodes ? 'Copied' : 'Copy All Codes'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCodes}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium text-[11px]"
                        data-testid="btn-download-backup-codes"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download (.txt)</span>
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={confirmedBackupSaved}
                      onChange={(e) => setConfirmedBackupSaved(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      data-testid="confirm-backup-saved-checkbox"
                    />
                    <span className="text-[11px] text-slate-700 font-medium leading-relaxed">
                      I have safely copied or downloaded my emergency backup codes in a secure location.
                    </span>
                  </label>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      disabled={!confirmedBackupSaved}
                      onClick={() => setStep(3)}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      data-testid="btn-step-2-next"
                    >
                      <span>Next: Verify Code</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Verify & Activate */}
              {step === 3 && (
                <form onSubmit={handleVerify} className="space-y-4" data-testid="mfa-step-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                    Enter the current 6-digit TOTP verification code generated by your authenticator app
                    to activate multi-factor authentication.
                  </div>

                  <div>
                    <label
                      htmlFor="input-totp-verify"
                      className="block font-semibold text-slate-700 mb-1 text-center"
                    >
                      6-Digit Security Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-totp-verify"
                      type="text"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => {
                        setVerifyCode(e.target.value.replace(/\D/g, ''));
                        if (error) setError(null);
                      }}
                      placeholder="123456"
                      autoFocus
                      className="w-48 mx-auto block px-3 py-2.5 text-center text-xl font-bold font-mono tracking-widest border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="input-totp-verify"
                      aria-required="true"
                    />
                  </div>

                  {error && (
                    <div
                      className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center"
                      data-testid="mfa-verify-error"
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isVerifying || verifyCode.length !== 6}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      data-testid="btn-verify-mfa-submit"
                    >
                      {isVerifying ? (
                        <span>Verifying...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Activate MFA Protection</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
