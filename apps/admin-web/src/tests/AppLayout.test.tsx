/**
 * Vitest AppLayout & Sidebar Navigation Tests
 * Traceability: FR-ADMIN-001, FR-ADMIN-009, NFR-USE-001, UI_Sample.jpeg
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../store/authContext';
import { AppLayout } from '../components/layout/AppLayout';
import { NavigationTab } from '../components/layout/Sidebar';

const LayoutTestWrapper: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  return (
    <AuthProvider>
      <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
        <div data-testid="tab-content">Current view: {activeTab}</div>
      </AppLayout>
    </AuthProvider>
  );
};

describe('AppLayout & Sidebar Navigation', () => {
  it('[FR-ADMIN-001, NFR-USE-001] renders deep navy sidebar with all platform navigation items', () => {
    render(<LayoutTestWrapper />);

    expect(screen.getByText('VeriSync')).toBeInTheDocument();
    expect(screen.getByText('Administrator Portal')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Candidates$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Question Bank$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Assessments$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Results$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reports$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Audit Logs$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Settings$/i })).toBeInTheDocument();
  });

  it('[FR-ADMIN-001] switches active tab and updates top bar header upon clicking sidebar item', () => {
    render(<LayoutTestWrapper />);

    // Initial state: Dashboard
    expect(screen.getByRole('heading', { name: /^Dashboard$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('tab-content')).toHaveTextContent('Current view: dashboard');

    // Click Candidates tab
    fireEvent.click(screen.getByRole('button', { name: /^Candidates$/i }));

    expect(screen.getByRole('heading', { name: /^Candidates$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Manage candidate accounts and details')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content')).toHaveTextContent('Current view: candidates');
  });

  it('[FR-ADMIN-001, FR-AUTH-006] renders notification button and admin menu with Sign out action', () => {
    render(<LayoutTestWrapper />);

    expect(screen.getByLabelText(/View notifications/i)).toBeInTheDocument();

    const profileButton = screen.getByRole('button', { name: /Admin/i });
    fireEvent.click(profileButton);

    expect(screen.getByRole('menuitem', { name: /Sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Admin Profile/i })).toBeInTheDocument();
  });
});
