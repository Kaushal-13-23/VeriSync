import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { mockApi } from './services/mockApi';
import { apiClient } from './services/apiClient';

/**
 * Candidate Desktop App Integration Tests
 * SRS Requirements:
 * - FR-AUTH-002: Candidate login screen mounting
 * - FR-CAN-007: Candidate ID / Username input acceptance
 * - FR-UI-001: Transition to System Check screen upon login
 */

describe('CandidateDesktop App Component (FR-AUTH-002, FR-CAN-007, FR-UI-001)', () => {
  beforeEach(() => {
    mockApi.resetStore();
    apiClient.setConfig({ forceMock: true });
  });

  it('renders login screen split view matching UI Sample', () => {
    render(<App />);

    // Brand Hero elements
    expect(screen.getAllByText(/VeriSync/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Secure Assessments. Fair Opportunities.')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getByText('Candidate Login')).toBeInTheDocument();
    expect(screen.getByLabelText(/Candidate ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('advances from Login to System Check upon successful authentication', async () => {
    render(<App />);

    const idInput = screen.getByLabelText(/Candidate ID/i);
    const passInput = screen.getByLabelText(/Password/i);
    const loginBtn = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(idInput, { target: { value: 'CAN-2026-081' } });
    fireEvent.change(passInput, { target: { value: 'CandidatePass123' } });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText('System Check')).toBeInTheDocument();
      expect(screen.getByText('Please ensure your system meets all requirements before starting the test.')).toBeInTheDocument();
    });
  });

  it('FR-UI-001: advances from System Check to Assigned Assessments screen when checks pass', async () => {
    render(<App />);

    // Login
    fireEvent.change(screen.getByLabelText(/Candidate ID/i), { target: { value: 'CAN-2026-081' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'CandidatePass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    // Wait for System Check
    await waitFor(() => {
      expect(screen.getByText('System Check')).toBeInTheDocument();
    });

    // Continue to Assessments
    const continueBtn = await screen.findByRole('button', { name: /Continue to Assessments/i });
    fireEvent.click(continueBtn);

    // Verify Assigned Assessments screen mounts
    await waitFor(() => {
      expect(screen.getByText('Assigned Assessments')).toBeInTheDocument();
      expect(screen.getByText(/Frontend Developer Assessment/i)).toBeInTheDocument();
    });
  });
});
