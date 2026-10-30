/**
 * VeriSync App Root Integration Tests
 * Traceability: FR-AUTH-001, FR-ADMIN-001, NFR-USE-001
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('AdminWeb Root App Integration', () => {
  it('[FR-AUTH-001, NFR-USE-001] mounts root App with split login view when unauthenticated', async () => {
    render(<App />);

    expect(screen.getByText('VeriSync')).toBeInTheDocument();
    expect(screen.getByText('Secure Assessments. Fair Opportunities.')).toBeInTheDocument();
    expect(screen.getByText('Trusted Assessments for a Brighter Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Administrator Login')).toBeInTheDocument();
    expect(screen.getByText('Access the VeriSync administration platform.')).toBeInTheDocument();
  });
});
