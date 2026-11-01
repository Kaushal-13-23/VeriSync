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
import { AlertCircle, AlertTriangle, Archive, X } from 'lucide-react';

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
  const [questionToArchive, setQuestionToArchive] = useState<QuestionRecord | null>(null);

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
    if (question.status === 'ACTIVE') {
      setQuestionToArchive(question);
    } else {
      // Direct restore for already archived questions
      archiveMutation.mutate({ id: question.id, status: 'ACTIVE' });
    }
  };

  const handleConfirmArchive = () => {
    if (!questionToArchive) return;
    archiveMutation.mutate({ id: questionToArchive.id, status: 'ARCHIVED' });
    setQuestionToArchive(null);
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

      {/* Archive Confirmation Modal (NFR-USE-004) */}
      {questionToArchive && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          data-testid="archive-question-modal"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Archive Question from Repository?
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {questionToArchive.id} • {questionToArchive.topic} (
                  {questionToArchive.questionType})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuestionToArchive(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
              &quot;{questionToArchive.questionText.slice(0, 120)}...&quot;
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Archiving this question removes it from active selection pools for future assessments.
              Existing published assessments already containing this question snapshot remain intact
              (Decision 5).
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuestionToArchive(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
                data-testid="btn-confirm-archive-question"
              >
                <Archive className="w-4 h-4" />
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
