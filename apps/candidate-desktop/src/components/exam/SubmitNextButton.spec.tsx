import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmitNextButton } from './SubmitNextButton';

describe('SubmitNextButton (FR-UI-006, FR-ANS-009, Rule 3)', () => {
  it('renders idle state with Submit & Next text and handles submit', () => {
    const onSubmit = vi.fn();
    render(
      <SubmitNextButton
        state="idle"
        isLastQuestion={false}
        onSubmit={onSubmit}
      />
    );

    const button = screen.getByRole('button', { name: /Submit & Next/i });
    expect(button).toBeDefined();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders Submit Assessment text on the last question', () => {
    const onSubmit = vi.fn();
    render(
      <SubmitNextButton
        state="idle"
        isLastQuestion={true}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /Submit Assessment/i })).toBeDefined();
  });

  it('prevents multiple clicks when in-flight (FR-UI-006 double click protection)', () => {
    const onSubmit = vi.fn();
    render(
      <SubmitNextButton
        state="in-flight"
        isLastQuestion={false}
        onSubmit={onSubmit}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/Submitting.../i)).toBeDefined();

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders retry state on failure and allows retry submission with preserved key', () => {
    const onSubmit = vi.fn();
    const onRetry = vi.fn();
    render(
      <SubmitNextButton
        state="retry"
        errorMessage="Network interruption"
        onSubmit={onSubmit}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/Network interruption \(Idempotency Key preserved\)/i)).toBeDefined();

    const retryButton = screen.getByRole('button', { name: /Retry Submission/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
