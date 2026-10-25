import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('AdminWeb App component', () => {
  it('renders VeriSync Administrator Portal headline and tagline', () => {
    render(<App />);

    expect(screen.getByText('VeriSync')).toBeInTheDocument();
    expect(screen.getByText('Administrator Portal')).toBeInTheDocument();
    expect(screen.getByText('Trusted Assessments for a Brighter Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Phase 0 Initialized')).toBeInTheDocument();
  });
});
