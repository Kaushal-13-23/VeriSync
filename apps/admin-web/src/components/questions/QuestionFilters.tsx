/**
 * Question Bank Filters & Search Bar
 * Traceability: FR-QB-001, FR-QB-004, UI_Sample.jpeg
 */

import React from 'react';
import { Search, PlusCircle, X } from 'lucide-react';

interface QuestionFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  topicFilter: string;
  onTopicFilterChange: (topic: string) => void;
  difficultyFilter: string;
  onDifficultyFilterChange: (diff: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  topicOptions: string[];
  onOpenAddModal: () => void;
}

export const QuestionFilters: React.FC<QuestionFiltersProps> = ({
  searchQuery,
  onSearchChange,
  topicFilter,
  onTopicFilterChange,
  difficultyFilter,
  onDifficultyFilterChange,
  typeFilter,
  onTypeFilterChange,
  topicOptions,
  onOpenAddModal,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 space-y-4">
      {/* Top row: Title and primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Question Bank Repository
          </h2>
          <p className="text-sm text-slate-500">
            Author and organize reusable questions, options, rubrics, and difficulty tiers.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 self-start sm:self-auto"
          data-testid="add-question-btn"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Filter controls row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
        {/* Search by question text or topic */}
        <div className="sm:col-span-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search questions or topic keywords..."
            className="block w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            data-testid="question-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Topic filter */}
        <div className="sm:col-span-3">
          <select
            value={topicFilter}
            onChange={(e) => onTopicFilterChange(e.target.value)}
            className="block w-full py-2 px-3 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
            data-testid="question-topic-filter"
          >
            <option value="ALL">All Topics</option>
            {topicOptions.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty filter */}
        <div className="sm:col-span-2">
          <select
            value={difficultyFilter}
            onChange={(e) => onDifficultyFilterChange(e.target.value)}
            className="block w-full py-2 px-3 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
            data-testid="question-difficulty-filter"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Question Type filter */}
        <div className="sm:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="block w-full py-2 px-3 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
            data-testid="question-type-filter"
          >
            <option value="ALL">All Question Types</option>
            <option value="MCQ_SINGLE">Single Choice (MCQ)</option>
            <option value="MCQ_MULTIPLE">Multiple Choice (MCQ)</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="SCENARIO">Scenario</option>
            <option value="DESCRIPTIVE">Descriptive</option>
            <option value="CODING">Coding (Phase 5)</option>
            <option value="SQL">SQL Query (Phase 5)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
