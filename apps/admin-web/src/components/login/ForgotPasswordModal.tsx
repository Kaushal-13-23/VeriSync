/**
 * Forgot Password Information Modal
 * Explains administrative credential recovery and security policy.
 * Traceability: FR-AUTH-005, NFR-SEC-002
 */

import React from 'react';
import { ShieldAlert, X, Mail } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 id="forgot-password-title" className="text-base font-bold text-slate-900">
                  Password Reset Policy
                </h3>
                <p className="text-xs text-slate-500">Security Requirement FR-AUTH-005</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              To maintain strict platform integrity, administrator passwords cannot be reset via
              unverified self-service email links.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs space-y-2">
              <div className="font-semibold text-slate-800 flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Standard Recovery Procedure:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Contact the system Super Administrator or your security operations officer.</li>
                <li>
                  An authorized reset workflow will issue a one-time temporary credential securely.
                </li>
                <li>Existing sessions are immediately revoked upon reset initiation.</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
