import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, FileCode, Users } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">VeriSync</h1>
            <p className="text-xs text-slate-500 font-medium">Administrator Portal</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Phase 0 Initialized
          </span>
          <span className="text-xs text-slate-400 font-mono">SRS v1.1</span>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Trusted Assessments for a Brighter Tomorrow
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              VeriSync secure placement-assessment platform. Admin Web app initialized successfully
              with Vite, React, TypeScript, and TailwindCSS.
            </p>
          </div>

          {/* Scaffold status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Security Engine</span>
              </div>
              <p className="text-xs text-slate-500">Argon2id + RBAC + Append-Only Audit Logging</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Candidates & Lab</span>
              </div>
              <p className="text-xs text-slate-500">Kiosk lockdown client + Synchronized timers</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                <FileCode className="w-4 h-4 text-blue-600" />
                <span>Evaluation</span>
              </div>
              <p className="text-xs text-slate-500">Docker-isolated multi-language code runner</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        VeriSync Platform &copy; 2026 &bull; SRS Baseline v1.1
      </footer>
    </div>
  );
};

export default App;
