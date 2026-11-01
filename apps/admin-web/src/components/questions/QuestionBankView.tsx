/**
 * VeriSync Question Bank Management View
 * Traceability: FR-QB-001..010, Rule 2, UI_Sample.jpeg
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionsApi } from '../../api/questions';
import { QuestionRecord, QuestionInput, QuestionDifficulty } from '../../types/api';
import { QuestionFilters } from './QuestionFilters';
import { QuestionTable } from './QuestionTable';
import { QuestionFormModal } from './QuestionFormModal';
import { toastManager } from '../../lib/toast';
import { AlertCircle } from 'lucide-react';

const DEFAULT_TOPICS = [
  'Data Structures',
  'Algorithms',
  'Networking',
  'Web Protocols',
  'System Design',
  'Databases',
  'Software Architecture',
  'Security',
];

export const QuestionBankView: React.FC = () => {
  const queryClient = useQueryClient();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionRecord | null>(null);

  // Fetch questions query
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'questions',
      {
        topic: topicFilter,
        difficulty: difficultyFilter,
        type: typeFilter,
        search: searchQuery,
      },
    ],
    queryFn: () =>
      questionsApi.getQuestions({
        topic: topicFilter !== 'ALL' ? topicFilter : undefined,
        difficulty:
          difficultyFilter !== 'ALL' ? (difficultyFilter as QuestionDifficulty) : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        search: searchQuery || undefined,
      }),
  });

  const questions = data?.questions || [];

  // Create question mutation
  const createMutation = useMutation({
    mutationFn: (input: QuestionInput) => questionsApi.createQuestion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toastManager.show({
        type: 'success',
        title: 'Question Created',
        message: 'Question added to repository successfully.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Failed to create question.',
      });
    },
  });

  // Update question mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<QuestionInput> }) =>
      questionsApi.updateQuestion(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toastManager.show({
        type: 'success',
        title: 'Question Updated',
        message: 'Question changes saved successfully.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update question.',
      });
    },
  });

  // Archive question mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'ARCHIVED' }) =>
      questionsApi.archiveQuestion(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toastManager.show({
        type: 'success',
        title: vars.status === 'ARCHIVED' ? 'Question Archived' : 'Question Restored',
        message: `Question marked as ${vars.status.toLowerCase()}.`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Failed to modify question status.',
      });
    },
  });

  const topicOptions = useMemo(() => {
    const list = new Set(DEFAULT_TOPICS);
    questions.forEach((q) => {
      if (q.topic) list.add(q.topic);
    });
    return Array.from(list);
  }, [questions]);

  const handleFormSubmit = async (input: QuestionInput) => {
    if (questionToEdit) {
      await updateMutation.mutateAsync({ id: questionToEdit.id, input });
      setQuestionToEdit(null);
    } else {
      await createMutation.mutateAsync(input);
    }
  };

  const handleToggleArchive = (question: QuestionRecord) => {
    const nextStatus = question.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    archiveMutation.mutate({ id: question.id, status: nextStatus });
  };

  return (
    <div className="space-y-6" data-testid="question-bank-view">
      {/* Filters & Actions */}
      <QuestionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        topicFilter={topicFilter}
        onTopicFilterChange={setTopicFilter}
        difficultyFilter={difficultyFilter}
        onDifficultyFilterChange={setDifficultyFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        topicOptions={topicOptions}
        onOpenAddModal={() => {
          setQuestionToEdit(null);
          setIsModalOpen(true);
        }}
      />

      {/* Query Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Unable to fetch question bank</h4>
            <p className="text-xs text-rose-600 mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <QuestionTable
        questions={questions}
        isLoading={isLoading}
        onEditQuestion={(q) => {
          setQuestionToEdit(q);
          setIsModalOpen(true);
        }}
        onToggleArchive={handleToggleArchive}
      />

      {/* Question Form Modal */}
      <QuestionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setQuestionToEdit(null);
        }}
        questionToEdit={questionToEdit}
        onSubmit={handleFormSubmit}
        topicOptions={topicOptions}
      />
    </div>
  );
};
