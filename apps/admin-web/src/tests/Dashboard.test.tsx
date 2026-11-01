/**
 * Vitest Dashboard Overview Component Tests
 * Traceability: FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-003, FR-ASMT-006, UI_Sample.jpeg
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardOverview />
    </QueryClientProvider>,
  );
};

describe('DashboardOverview Component', () => {
  it('[FR-ADMIN-001] renders 4 stat cards with counts and trends from API', async () => {
    renderDashboard();

    expect(await screen.findByText('Total Candidates')).toBeInTheDocument();
    expect(screen.getByText('1,248')).toBeInTheDocument();
    expect(screen.getByText('+ 12%')).toBeInTheDocument();

    expect(screen.getByText('Assessments')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();

    expect(screen.getByText('Completed Tests')).toBeInTheDocument();
    expect(screen.getAllByText('892')).toHaveLength(2);

    expect(screen.getByText('Active Candidates')).toBeInTheDocument();
    expect(screen.getByText('356')).toBeInTheDocument();
  });

  it('[FR-ADMIN-001, FR-AUD-002] renders recent activity operations feed', async () => {
    renderDashboard();

    expect(await screen.findByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('New candidate added')).toBeInTheDocument();
    expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    expect(screen.getByText('Assessment scheduled')).toBeInTheDocument();
    expect(screen.getByText('Technical Assessment - Round 1')).toBeInTheDocument();
    expect(screen.getByText('Test completed')).toBeInTheDocument();
    expect(screen.getByText('Aisha Khan')).toBeInTheDocument();
  });

  it('[FR-ADMIN-003] renders test completion rate donut chart and breakdown metrics', async () => {
    renderDashboard();

    expect(await screen.findByText('Test Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('[FR-ASMT-006] renders upcoming scheduled assessments list', async () => {
    renderDashboard();

    expect(await screen.findByText('Upcoming Assessments')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer Test')).toBeInTheDocument();
    expect(screen.getByText('24 Oct 2024 | 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Data Analyst Assessment')).toBeInTheDocument();
    expect(screen.getByText('25 Oct 2024 | 02:00 PM')).toBeInTheDocument();
  });
});
