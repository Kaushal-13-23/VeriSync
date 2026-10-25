import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('CandidateDesktop App component', () => {
  it('renders welcome screen and kiosk indicator', () => {
    render(<App />);

    expect(screen.getByText('VeriSync')).toBeInTheDocument();
    expect(screen.getByText('Secure Candidate Client')).toBeInTheDocument();
    expect(screen.getByText('Welcome to VeriSync')).toBeInTheDocument();
    expect(screen.getByText('Kiosk Shell Initialized')).toBeInTheDocument();
  });
});
