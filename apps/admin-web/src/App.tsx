/**
 * VeriSync Administrator Web Portal Main Application
 * Integrates QueryClientProvider, AuthProvider, ToastContainer, ProtectedRoute, AppLayout, and Dashboard.
 * Traceability: FR-AUTH-001, FR-AUTH-008, FR-ADMIN-001, NFR-USE-001
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './store/authContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { NavigationTab } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { CandidatesView } from './components/candidates/CandidatesView';
import { QuestionBankView } from './components/questions/QuestionBankView';
import { AssessmentsView } from './components/assessments/AssessmentsView';
import { LiveSessionsView } from './components/sessions/LiveSessionsView';
import { ResultsView } from './components/results/ResultsView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { LabDevicesView } from './components/devices/LabDevicesView';
import { SecuritySettingsView } from './components/settings/SecuritySettingsView';
import { TabPlaceholder } from './components/common/TabPlaceholder';
import { ToastContainer } from './components/ui/ToastContainer';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { SessionTimeoutModal } from './components/common/SessionTimeoutModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  const { isWarningModalOpen, remainingSeconds, extendSession, terminateSession } =
    useSessionTimeout();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)} />;
      case 'live-sessions':
        return <LiveSessionsView />;
      case 'candidates':
        return <CandidatesView />;
      case 'question-bank':
        return <QuestionBankView />;
      case 'assessments':
        return <AssessmentsView />;
      case 'results':
        return <ResultsView />;
      case 'reports':
        return <ReportsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'lab-devices':
        return <LabDevicesView />;
      case 'settings':
        return <SecuritySettingsView />;
      default:
        return (
          <TabPlaceholder tab={activeTab} onReturnToDashboard={() => setActiveTab('dashboard')} />
        );
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
        {renderContent()}
      </AppLayout>

      {/* Session Inactivity Timeout Modal (FR-AUTH-007, NFR-SEC-004) */}
      <SessionTimeoutModal
        isOpen={isWarningModalOpen}
        remainingSeconds={remainingSeconds}
        onContinue={extendSession}
        onLogout={terminateSession}
      />
    </ProtectedRoute>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
