/**
 * Vitest Admin Login & MFA Flow Tests
 * Traceability: FR-AUTH-001, FR-AUTH-004, FR-AUTH-005, FR-AUTH-008, NFR-USE-001
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../store/authContext';
import { AdminLogin } from '../components/login/AdminLogin';

const renderLogin = () => {
  return render(
    <AuthProvider>
      <AdminLogin />
    </AuthProvider>
  );
};

describe('AdminLogin Component', () => {
  it('[FR-AUTH-001, NFR-USE-001] renders brand identity panel and administrator login form', () => {
    renderLogin();

    expect(screen.getByText('VeriSync')).toBeInTheDocument();
    expect(screen.getByText('Trusted Assessments for a Brighter Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Administrator Login')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address or Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Login$/i })).toBeInTheDocument();
  });

  it('[FR-AUTH-004] shows validation error when submitting empty fields', async () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /^Login$/i }));

    expect(
      await screen.findByText('Please enter your administrator email address or username.')
    ).toBeInTheDocument();
  });

  it('[FR-AUTH-005] displays password reset security policy modal when forgot password is clicked', async () => {
    renderLogin();

    fireEvent.click(screen.getByText(/Forgot password\?/i));

    expect(await screen.findByText('Password Reset Policy')).toBeInTheDocument();
    expect(screen.getByText(/Security Requirement FR-AUTH-005/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Understood/i }));
    await waitFor(() => {
      expect(screen.queryByText('Password Reset Policy')).not.toBeInTheDocument();
    });
  });

  it('[FR-AUTH-001, FR-AUTH-008] submits credentials and transitions to MFA TOTP verification step', async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email address or Username/i), {
      target: { value: 'admin@verisync.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'SuperAdmin123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Login$/i }));

    // Expect transition to MFA TOTP screen
    expect(await screen.findByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByLabelText(/6-Digit Security Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify Code/i })).toBeInTheDocument();
  });
});
