/**
 * Toast Container Component
 * Displays animated, accessible toasts with SRS 8.3.3 error badges and correlation IDs.
 * Traceability: SRS 8.3.3, NFR-USE-003, Rule 9
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Copy, Check } from 'lucide-react';
import { toastManager, ToastItem } from '../../lib/toast';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    return toastManager.subscribe((updated) => {
      setToasts(updated);
    });
  }, []);

  const handleCopyCorrelationId = (id: string, correlationId: string) => {
    navigator.clipboard.writeText(correlationId);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        let colorClass = 'border-slate-200 bg-white text-slate-900';
        let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;

        if (toast.type === 'error') {
          colorClass = 'border-rose-200 bg-rose-50/90 text-rose-950';
          icon = <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />;
        } else if (toast.type === 'success') {
          colorClass = 'border-emerald-200 bg-emerald-50/90 text-emerald-950';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
        } else if (toast.type === 'warning') {
          colorClass = 'border-amber-200 bg-amber-50/90 text-amber-950';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto rounded-xl border p-4 shadow-lg transition-all duration-200 flex items-start space-x-3 backdrop-blur-sm ${colorClass}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-tight leading-5">{toast.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">
                {toast.message}
              </p>
              {toast.correlationId && (
                <div className="mt-2 flex items-center space-x-1.5 text-[11px] font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200 w-fit">
                  <span>cid: {toast.correlationId}</span>
                  <button
                    type="button"
                    title="Copy Correlation ID"
                    onClick={() => handleCopyCorrelationId(toast.id, toast.correlationId!)}
                    className="p-0.5 hover:text-slate-800 rounded focus:outline-none"
                  >
                    {copiedId === toast.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => toastManager.dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg focus:outline-none shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
