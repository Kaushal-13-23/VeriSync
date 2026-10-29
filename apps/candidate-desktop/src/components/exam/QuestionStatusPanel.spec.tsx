import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionStatusPanel, QuestionStatusItem } from './QuestionStatusPanel';

describe('QuestionStatusPanel (Decision 1, FR-UI-004, FR-UI-005)', () => {
  const sampleItems: QuestionStatusItem[] = [
    { id: 'q1', index: 0, displayNumber: 1, section: 'MCQ', isAnswered: true, isCurrent: false },
    { id: 'q2', index: 1, displayNumber: 2, section: 'MCQ', isAnswered: false, isCurrent: true },
    { id: 'q3', index: 2, displayNumber: 3, section: 'MCQ', isAnswered: false, isCurrent: false, isMarkedForReview: true },
    { id: 'q4', index: 3, displayNumber: 4, section: 'Coding', isAnswered: false, isCurrent: false },
  ];

  it('renders question palette items and section headers', () => {
    render(<QuestionStatusPanel questions={sampleItems} currentIndex={1} isSequentialMode={true} />);

    expect(screen.getByText('MCQ')).toBeDefined();
    expect(screen.getByText('Coding')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
  });

  it('enforces read-only behavior in sequential mode (items are disabled from jumping)', () => {
    const onSelect = vi.fn();
    render(
      <QuestionStatusPanel
        questions={sampleItems}
        currentIndex={1}
        isSequentialMode={true}
        onSelectQuestion={onSelect}
      />
    );

    const button1 = screen.getByLabelText(/Question 1 - Answered/i);
    fireEvent.click(button1);

    // In sequential mode, clicks must not trigger question switching
    expect(onSelect).not.toHaveBeenCalled();
    expect(button1).toBeDisabled();
  });

  it('allows clicking items when sequential mode is explicitly disabled (Free navigation)', () => {
    const onSelect = vi.fn();
    render(
      <QuestionStatusPanel
        questions={sampleItems}
        currentIndex={1}
        isSequentialMode={false}
        onSelectQuestion={onSelect}
      />
    );

    const button3 = screen.getByLabelText(/Question 3/i);
    fireEvent.click(button3);

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('renders status legend tokens (Answered, Current, Not Answered, Mark for Review)', () => {
    render(<QuestionStatusPanel questions={sampleItems} currentIndex={1} isSequentialMode={true} />);

    expect(screen.getByText('Answered')).toBeDefined();
    expect(screen.getByText('Current Question')).toBeDefined();
    expect(screen.getByText('Not Answered')).toBeDefined();
    expect(screen.getByText('Mark for Review')).toBeDefined();
  });
});
