/**
 * VeriSync Administrator Login & Multi-Factor Authentication Component
 * Implements split-screen branding panel and dynamic TOTP verification step.
 * Traceability: FR-AUTH-001, FR-AUTH-004, FR-AUTH-008, NFR-USE-001, UI_Sample.jpeg
 */

import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const AdminLogin: React.FC = () => {
  const { login, verifyMfa, cancelMfa, mfaRequired, pendingIdentifier } = useAuth();

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // MFA form state
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Forgot password modal
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!identifier.trim()) {
      setLoginError('Please enter your administrator email address or username.');
      return;
    }
    if (!password) {
      setLoginError('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setLoginError(error.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    const cleanCode = mfaCode.trim().replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setMfaError('Please enter a valid 6-digit numeric TOTP code.');
      return;
    }

    setIsVerifyingMfa(true);
    try {
      await verifyMfa(cleanCode);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMfaError(error.message || 'MFA verification failed. Please try again.');
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50">
      {/* LEFT PANEL: Brand identity matching docs/design/UI_Sample.jpeg */}
      <div className="w-full md:w-5/12 lg:w-1/2 bg-slate-900 text-white p-8 md:p-14 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle geometric gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 opacity-95 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
                VeriSync
              </h1>
              <p className="text-xs text-blue-200/80 font-medium tracking-wide">
                Secure Assessments. Fair Opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* Center Tagline Panel */}
        <div className="relative z-10 my-12 md:my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Enterprise Assessment Security</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Trusted Assessments for a Brighter Tomorrow
          </h2>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Centralized administration hub providing tamper-evident assessment monitoring, synchronized timing enforcement, and cryptographically verified candidate evaluations.
          </p>

          <div className="pt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-Factor Authenticated</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Immutable Audit Logs</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Authoritative Server Timers</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Role-Based Access (RBAC)</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 text-xs text-slate-400 border-t border-slate-800/80 flex items-center justify-between">
          <span>VeriSync Platform v1.1</span>
          <span>SRS Compliant &bull; ISO-8601 UTC</span>
        </div>
      </div>

      {/* RIGHT PANEL: Login or MFA challenge card */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-8 sm:p-10 transition-all">
          {!mfaRequired ? (
            /* STEP 1: Email / Password credentials (FR-AUTH-001) */
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  Administrator Login
                </h3>
                <p className="text-sm text-slate-500">
                  Access the VeriSync administration platform.
                </p>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed flex items-start space-x-2 animate-in fade-in duration-150"
                >
                  <span className="font-semibold shrink-0">Error:</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate>
                {/* Identifier Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-identifier"
                    className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
                  >
                    Email address or Username
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="admin-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="admin@verisync.com or admin"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
                  >
                    Password
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-600">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="font-medium text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* STEP 2: Multi-Factor Authentication Challenge (FR-AUTH-008) */
            <div className="space-y-6 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={cancelMfa}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to credentials</span>
              </button>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Enter the 6-digit TOTP verification code from your authenticator device for account{' '}
                  <span className="font-semibold text-slate-700">{pendingIdentifier}</span>.
                </p>
              </div>

              {mfaError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed flex items-start space-x-2 animate-in fade-in duration-150"
                >
                  <span className="font-semibold shrink-0">Error:</span>
                  <span>{mfaError}</span>
                </div>
              )}

              <form onSubmit={handleMfaSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <label
                    htmlFor="mfa-code-input"
                    className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
                  >
                    6-Digit Security Code
                  </label>
                  <input
                    id="mfa-code-input"
                    name="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="block w-full py-3 text-center text-2xl font-mono tracking-widest rounded-xl border border-slate-300 placeholder-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 text-center">
                    (In mock mode, enter any 6-digit code such as 123456)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingMfa || mfaCode.trim().length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isVerifyingMfa ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <span>Verify Code</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
