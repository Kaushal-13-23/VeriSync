/**
 * Vitest Question Bank Repository Suite
 * Traceability: FR-QB-001..010, Rule 2, UI_Sample.jpeg
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuestionBankView } from '../components/questions/QuestionBankView';

const renderQuestionBank = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <QuestionBankView />
    </QueryClientProvider>,
  );
};

describe('Question Bank View', () => {
  it('[FR-QB-001, FR-QB-004] renders question table with difficulty chips, types, and marks', async () => {
    renderQuestionBank();

    expect(await screen.findByText('q-101')).toBeInTheDocument();
    expect(
      screen.getByText(
        'What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL tree)?',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('diff-badge-q-101')).toHaveTextContent('Easy');
    expect(screen.getByText('Single Choice')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('[FR-QB-004] filters questions by topic and difficulty', async () => {
    renderQuestionBank();

    expect(await screen.findByText('q-101')).toBeInTheDocument();

    // Select Difficulty: Hard
    const diffSelect = screen.getByTestId('question-difficulty-filter');
    fireEvent.change(diffSelect, { target: { value: 'Hard' } });

    await waitFor(() => {
      expect(screen.getByText('q-105')).toBeInTheDocument();
      expect(screen.queryByText('q-101')).not.toBeInTheDocument();
    });
  });

  it('[FR-QB-002, FR-QB-005] authors new question with options editor and marks correct answer', async () => {
    renderQuestionBank();

    const addBtn = await screen.findByTestId('add-question-btn');
    fireEvent.click(addBtn);

    expect(screen.getByTestId('question-form-modal')).toBeInTheDocument();

    // Select Single Choice MCQ
    fireEvent.click(screen.getByTestId('type-btn-MCQ_SINGLE'));

    // Fill topic and question statement
    fireEvent.change(screen.getByTestId('input-question-topic'), {
      target: { value: 'Computer Networks' },
    });
    fireEvent.change(screen.getByTestId('textarea-question-text'), {
      target: { value: 'Which layer of OSI model performs logical addressing and routing?' },
    });

    // Edit options
    fireEvent.change(screen.getByTestId('option-input-0'), {
      target: { value: 'Network Layer' },
    });
    fireEvent.change(screen.getByTestId('option-input-1'), {
      target: { value: 'Transport Layer' },
    });

    // Mark option 0 as correct
    fireEvent.click(screen.getByTestId('option-correct-0'));

    // Submit
    fireEvent.click(screen.getByTestId('btn-submit-question'));

    await waitFor(() => {
      expect(screen.queryByTestId('question-form-modal')).not.toBeInTheDocument();
    });
  });

  it('[FR-QB-003] toggles archive status on question', async () => {
    renderQuestionBank();

    const archiveBtn = await screen.findByTestId('btn-archive-question-q-101');
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
    });
  });
});
