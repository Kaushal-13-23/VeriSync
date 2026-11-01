/**
 * Reset Candidate Password Modal
 * Generates authoritative one-time credentials for candidate account.
 * Traceability: FR-AUTH-005, FR-AUTH-009, Rule 5
 */

import React, { useState } from 'react';
import { X, KeyRound, Copy, Check, ShieldAlert, AlertTriangle } from 'lucide-react';
import { CandidateRecord } from '../../types/api';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateRecord | null;
  onConfirmReset: (candidateId: string) => Promise<string | undefined>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onConfirmReset,
}) => {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !candidate) return null;

  const handleReset = async () => {
    try {
      setIsResetting(true);
      const tempPass = await onConfirmReset(candidate.id);
      if (tempPass) {
        setTemporaryPassword(tempPass);
      }
    } catch {
      // Error handled by caller
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopy = () => {
    if (!temporaryPassword) return;
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleModalClose = () => {
    setTemporaryPassword(null);
    setCopied(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="reset-password-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reset Candidate Password</h3>
              <p className="text-xs text-slate-500 font-mono">{candidate.candidateIdentifier}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {!temporaryPassword ? (
            <>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Authoritative Reset Confirmation</span>
                  <p className="mt-0.5">
                    Generating a new password will revoke any active sessions for{' '}
                    <strong>{candidate.fullName}</strong>.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p>
                  <strong>Candidate:</strong> {candidate.fullName}
                </p>
                <p>
                  <strong>Email:</strong> {candidate.email}
                </p>
                <p>
                  <strong>Username:</strong> {candidate.username}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  data-testid="btn-confirm-reset-pw"
                >
                  {isResetting ? 'Generating...' : 'Generate New Password'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                Temporary password generated successfully. Provide this credential to the candidate.
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Temporary Password
                </label>
                <div className="flex items-center justify-between p-3 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl border border-slate-800">
                  <span data-testid="generated-temp-password">{temporaryPassword}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium rounded-lg transition-colors border border-slate-700"
                    data-testid="btn-copy-temp-password"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  The candidate will be forced to change this password on their next login session
                  (FR-AUTH-009).
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                  data-testid="btn-close-reset-modal"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
