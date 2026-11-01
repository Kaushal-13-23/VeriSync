/**
 * VeriSync App Layout Shell
 * Combines Sidebar, TopBar, and main content area matching UI_Sample.jpeg tokens.
 * Traceability: FR-ADMIN-001, NFR-USE-001
 */

import React from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Welcome back, Admin',
  },
  'live-sessions': {
    title: 'Live Sessions Monitoring',
    subtitle: 'Real-time candidate telemetry and authoritative overrides',
  },
  candidates: {
    title: 'Candidates',
    subtitle: 'Manage candidate accounts and details',
  },
  'question-bank': {
    title: 'Question Bank',
    subtitle: 'Create and manage assessment questions',
  },
  assessments: {
    title: 'Assessments',
    subtitle: 'Configure new assessment for candidates',
  },
  results: {
    title: 'Results',
    subtitle: 'View assessment results and detailed reports',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Export performance summaries and analytics',
  },
  'audit-logs': {
    title: 'Audit Logs',
    subtitle: 'Authoritative audit trail inspection (FR-AUD-001)',
  },
  'lab-devices': {
    title: 'Lab Devices',
    subtitle: 'Authorized workstation registry and lockdown management (UC-17, FR-LAB)',
  },
  settings: {
    title: 'Security Settings',
    subtitle: 'MFA enforcement, session timeout policies, and client compatibility (NFR-SEC)',
  },
};

export const AppLayout: React.FC<AppLayoutProps> = ({ activeTab, onSelectTab, children }) => {
  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Skip to Main Content Link (NFR-USE-005) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-3 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopBar title={currentTabInfo.title} subtitle={currentTabInfo.subtitle} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 focus:outline-none"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
