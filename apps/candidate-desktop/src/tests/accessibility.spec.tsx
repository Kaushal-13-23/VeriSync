import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExamScreen } from '../screens/ExamScreen';
import { mockApi, MockAssessmentSession } from '../services/mockApi';
import { apiClient } from '../services/apiClient';

/**
 * Accessibility Verification within Lockdown Limits (NFR-USE-005)
 * - Keyboard navigation & shortcuts (Alt+S, Alt+M, Alt+C, 1-4)
 * - Contrast mode toggle (High Contrast vs Standard)
 * - Font scaling (A, A+, A++)
 * - ARIA landmarks & labels
 */

describe('Exam Interface Accessibility (NFR-USE-005)', () => {
  let session: MockAssessmentSession;
  const mockFinish = vi.fn();

  beforeEach(() => {
    vi.useRealTimers();
    mockApi.resetStore();
    apiClient.setConfig({ forceMock: true });
    session = mockApi.initMockSession('CAN-2026-081', 'asmt-frontend-2026');
  });

  it('toggles font scaling between Normal, Large, and Extra Large', () => {
    render(<ExamScreen session={session} onFinishExam={mockFinish} />);

    const normalBtn = screen.getByRole('button', { name: /^Normal Font Size$/i });
    const largeBtn = screen.getByRole('button', { name: /^Large Font Size$/i });
    const xlargeBtn = screen.getByRole('button', { name: /^Extra Large Font Size$/i });

    expect(normalBtn).toHaveAttribute('aria-pressed', 'true');
    expect(largeBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to Large
    fireEvent.click(largeBtn);
    expect(largeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(normalBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to Extra Large
    fireEvent.click(xlargeBtn);
    expect(xlargeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles high contrast mode and updates visual landmarks', () => {
    render(<ExamScreen session={session} onFinishExam={mockFinish} />);

    const contrastBtn = screen.getByRole('button', { name: /Toggle High Contrast Mode/i });
    expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');

    // Enable High Contrast
    fireEvent.click(contrastBtn);
    expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Standard')).toBeInTheDocument();

    // Disable High Contrast
    fireEvent.click(contrastBtn);
    expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Contrast')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts for option selection (1-4 keys) on active question', () => {
    render(<ExamScreen session={session} onFinishExam={mockFinish} />);

    // Press '2' to select option 2
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    });

    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toBeChecked();

    // Press '3' to change to option 3
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    });
    expect(radios[2]).toBeChecked();
  });

  it('handles keyboard shortcuts Alt+M (Mark for Review) and Alt+C (Clear Response)', () => {
    render(<ExamScreen session={session} onFinishExam={mockFinish} />);

    // Select option 1
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    });
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();

    // Alt+M toggles review
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', altKey: true }));
    });
    expect(screen.getByText(/Marked for Review/i)).toBeInTheDocument();

    // Alt+C clears response
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', altKey: true }));
    });
    expect(radios[0]).not.toBeChecked();
  });
});
