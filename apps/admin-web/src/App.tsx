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
import { TabPlaceholder } from './components/common/TabPlaceholder';
import { ToastContainer } from './components/ui/ToastContainer';

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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)} />;
      case 'candidates':
        return <CandidatesView />;
      case 'question-bank':
        return <QuestionBankView />;
      case 'assessments':
        return <AssessmentsView />;
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
