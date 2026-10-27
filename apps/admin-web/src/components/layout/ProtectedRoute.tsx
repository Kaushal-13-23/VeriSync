/**
 * VeriSync Protected Route & RBAC Guard
 * Protects administrative screens against unauthenticated sessions and enforces role-based access.
 * Traceability: FR-AUTH-001, FR-ADMIN-009, NFR-SEC-003, SRS 8.3.3
 */

import React from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { UserRole } from '../../types/api';
import { AdminLogin } from '../login/AdminLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, accessToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Restoring secure session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated -> show AdminLogin screen
  if (!accessToken || !user) {
    return <AdminLogin />;
  }

  // Role authorization check (FR-ADMIN-009, SRS 8.3.3 FORBIDDEN)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your role (<span className="font-semibold text-slate-800">{user.role}</span>) does not
            have permission to view this section (SRS Section 8.3.3: FORBIDDEN).
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
