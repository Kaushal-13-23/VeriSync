/**
 * Question Bank Table Component with Difficulty Chips & Type Badges
 * Traceability: FR-QB-001, FR-QB-003, FR-QB-004, UI_Sample.jpeg
 */

import React from 'react';
import { Edit3, Archive, RotateCcw, HelpCircle, Code, CheckCircle } from 'lucide-react';
import { QuestionRecord, QuestionDifficulty, QuestionType } from '../../types/api';

interface QuestionTableProps {
  questions: QuestionRecord[];
  isLoading: boolean;
  onEditQuestion: (question: QuestionRecord) => void;
  onToggleArchive: (question: QuestionRecord) => void;
}

const DIFFICULTY_CONFIG: Record<
  QuestionDifficulty,
  { label: string; badgeClass: string; dotClass: string }
> = {
  Easy: {
    label: 'Easy',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  Medium: {
    label: 'Medium',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  Hard: {
    label: 'Hard',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

const TYPE_CONFIG: Record<QuestionType, { label: string; badgeClass: string }> = {
  MCQ_SINGLE: {
    label: 'Single Choice',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  MCQ_MULTIPLE: {
    label: 'Multiple Choice',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  TRUE_FALSE: { label: 'True / False', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  SHORT_ANSWER: {
    label: 'Short Answer',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  SCENARIO: { label: 'Scenario', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  DESCRIPTIVE: { label: 'Descriptive', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  CODING: { label: 'Coding (P5)', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  SQL: { label: 'SQL (P5)', badgeClass: 'bg-teal-50 text-teal-700 border-teal-300' },
};

export const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  isLoading,
  onEditQuestion,
  onToggleArchive,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Loading question repository...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center"
        data-testid="empty-questions"
      >
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No questions found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          No questions match your filter criteria. Try resetting your search filters or click
          &quot;Add Question&quot; to author a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200" data-testid="questions-table">
          <thead className="bg-slate-50/75">
            <tr>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Question & Topic
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Difficulty
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Marks
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {questions.map((q) => {
              const diffCfg = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.Easy;
              const typeCfg = TYPE_CONFIG[q.questionType] || TYPE_CONFIG.MCQ_SINGLE;

              return (
                <tr
                  key={q.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                  data-testid={`question-row-${q.id}`}
                >
                  {/* Question Text & Topic */}
                  <td className="px-5 py-4 max-w-md">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {q.id}
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                          {q.topic}
                        </span>
                        {q.codeSnippet && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            <Code className="w-3 h-3" />
                            Snippet
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-900 line-clamp-2 leading-relaxed">
                        {q.questionText}
                      </p>

                      {/* Options preview for MCQ/TF */}
                      {q.options && q.options.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {q.options.length} options (
                            {q.options.filter((o) => o.isCorrect).length} correct)
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Question Type */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${typeCfg.badgeClass}`}
                    >
                      {typeCfg.label}
                    </span>
                  </td>

                  {/* Difficulty */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${diffCfg.badgeClass}`}
                      data-testid={`diff-badge-${q.id}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${diffCfg.dotClass}`} />
                      {diffCfg.label}
                    </span>
                  </td>

                  {/* Marks / Negative Marks */}
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-800">+{q.maximumMarks}</span>
                      {q.negativeMarks > 0 ? (
                        <span className="text-[11px] font-medium text-rose-600">
                          -{q.negativeMarks}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">0 neg</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                        q.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditQuestion(q)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit Question"
                        data-testid={`btn-edit-question-${q.id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleArchive(q)}
                        className={`p-1.5 rounded-md transition-colors ${
                          q.status === 'ACTIVE'
                            ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={q.status === 'ACTIVE' ? 'Archive Question' : 'Restore Question'}
                        data-testid={`btn-archive-question-${q.id}`}
                      >
                        {q.status === 'ACTIVE' ? (
                          <Archive className="w-4 h-4" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count summary */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Total Questions in View: <strong>{questions.length}</strong>
        </span>
        <span>Per-question timers configured in Assessments wizard</span>
      </div>
    </div>
  );
};
