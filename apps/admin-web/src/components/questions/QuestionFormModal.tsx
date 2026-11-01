/**
 * Question Authoring Modal with Dynamic Type Switcher and Options Editor
 * Traceability: FR-QB-001..010, Rule 2, UI_Sample.jpeg
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, Info, Code2 } from 'lucide-react';
import {
  QuestionRecord,
  QuestionInput,
  QuestionType,
  QuestionDifficulty,
  QuestionOption,
} from '../../types/api';

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: QuestionRecord | null;
  onSubmit: (data: QuestionInput) => Promise<void>;
  topicOptions: string[];
}

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  onSubmit,
  topicOptions,
}) => {
  const isEditing = Boolean(questionToEdit);

  const [questionType, setQuestionType] = useState<QuestionType>('MCQ_SINGLE');
  const [topic, setTopic] = useState('Data Structures');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [maximumMarks, setMaximumMarks] = useState<number>(2);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.5);
  const [questionText, setQuestionText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { optionText: '', displayOrder: 1, isCorrect: false },
    { optionText: '', displayOrder: 2, isCorrect: false },
    { optionText: '', displayOrder: 3, isCorrect: false },
    { optionText: '', displayOrder: 4, isCorrect: false },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (questionToEdit) {
      setQuestionType(questionToEdit.questionType);
      setTopic(questionToEdit.topic);
      setDifficulty(questionToEdit.difficulty);
      setMaximumMarks(questionToEdit.maximumMarks);
      setNegativeMarks(questionToEdit.negativeMarks || 0);
      setQuestionText(questionToEdit.questionText);
      setCodeSnippet(questionToEdit.codeSnippet || '');
      setExplanation(questionToEdit.explanation || '');
      setOptions(
        questionToEdit.options && questionToEdit.options.length > 0
          ? questionToEdit.options
          : [
              { optionText: '', displayOrder: 1, isCorrect: false },
              { optionText: '', displayOrder: 2, isCorrect: false },
            ],
      );
    } else {
      setQuestionType('MCQ_SINGLE');
      setTopic(topicOptions[0] || 'Data Structures');
      setDifficulty('Easy');
      setMaximumMarks(2);
      setNegativeMarks(0.5);
      setQuestionText('');
      setCodeSnippet('');
      setExplanation('');
      setOptions([
        { optionText: '', displayOrder: 1, isCorrect: true },
        { optionText: '', displayOrder: 2, isCorrect: false },
        { optionText: '', displayOrder: 3, isCorrect: false },
        { optionText: '', displayOrder: 4, isCorrect: false },
      ]);
    }
    setErrors({});
  }, [questionToEdit, isOpen, topicOptions]);

  // Adjust default options when switching to TRUE_FALSE
  const handleTypeChange = (newType: QuestionType) => {
    setQuestionType(newType);
    if (newType === 'TRUE_FALSE') {
      setOptions([
        { optionText: 'True', displayOrder: 1, isCorrect: true },
        { optionText: 'False', displayOrder: 2, isCorrect: false },
      ]);
    } else if ((newType === 'MCQ_SINGLE' || newType === 'MCQ_MULTIPLE') && options.length < 2) {
      setOptions([
        { optionText: '', displayOrder: 1, isCorrect: true },
        { optionText: '', displayOrder: 2, isCorrect: false },
      ]);
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].optionText = text;
    setOptions(updated);
  };

  const handleOptionCorrectToggle = (index: number) => {
    if (questionType === 'MCQ_SINGLE' || questionType === 'TRUE_FALSE') {
      // Single selection: set only this option as correct
      const updated = options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      setOptions(updated);
    } else if (questionType === 'MCQ_MULTIPLE') {
      // Multi selection: toggle current
      const updated = [...options];
      updated[index].isCorrect = !updated[index].isCorrect;
      setOptions(updated);
    }
  };

  const handleAddOption = () => {
    if (options.length >= 8) return;
    setOptions([
      ...options,
      {
        optionText: '',
        displayOrder: options.length + 1,
        isCorrect: false,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const filtered = options.filter((_, i) => i !== index);
    const reindexed = filtered.map((opt, i) => ({
      ...opt,
      displayOrder: i + 1,
    }));
    setOptions(reindexed);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!questionText.trim()) {
      newErrors.questionText = 'Question prompt text is required.';
    }
    if (!topic.trim()) {
      newErrors.topic = 'Question topic category is required.';
    }
    if (maximumMarks <= 0) {
      newErrors.maximumMarks = 'Maximum marks must be greater than 0.';
    }
    if (negativeMarks < 0) {
      newErrors.negativeMarks = 'Negative marks cannot be less than 0.';
    }
    if (negativeMarks > maximumMarks) {
      newErrors.negativeMarks = 'Negative marks cannot exceed maximum marks.';
    }

    const isObjective =
      questionType === 'MCQ_SINGLE' ||
      questionType === 'MCQ_MULTIPLE' ||
      questionType === 'TRUE_FALSE';

    const validOptions = options.filter((o) => o.optionText.trim().length > 0);

    if (isObjective) {
      if (validOptions.length < 2) {
        newErrors.options = 'At least 2 options with non-empty text are required.';
      }
      const hasCorrect = validOptions.some((o) => o.isCorrect);
      if (!hasCorrect) {
        newErrors.options = 'At least one option must be marked as the correct answer.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const isObjective =
      questionType === 'MCQ_SINGLE' ||
      questionType === 'MCQ_MULTIPLE' ||
      questionType === 'TRUE_FALSE';

    const validOptions = options.filter((o) => o.optionText.trim().length > 0);

    const payload: QuestionInput = {
      questionType,
      questionText: questionText.trim(),
      codeSnippet: codeSnippet.trim() ? codeSnippet.trim() : undefined,
      topic: topic.trim(),
      difficulty,
      maximumMarks: Number(maximumMarks),
      negativeMarks: Number(negativeMarks) || 0,
      explanation: explanation.trim() ? explanation.trim() : undefined,
      options: isObjective ? validOptions : [],
    };

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isObjective =
    questionType === 'MCQ_SINGLE' ||
    questionType === 'MCQ_MULTIPLE' ||
    questionType === 'TRUE_FALSE';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="question-form-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Edit Question' : 'Author New Question'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure question metadata, options, grading scheme, and evaluation rubric
              (FR-QB-001..010).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="question-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Question Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Question Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { type: 'MCQ_SINGLE', label: 'Single Choice MCQ' },
                  { type: 'MCQ_MULTIPLE', label: 'Multi Choice MCQ' },
                  { type: 'TRUE_FALSE', label: 'True / False' },
                  { type: 'SHORT_ANSWER', label: 'Short Answer' },
                  { type: 'SCENARIO', label: 'Scenario / Design' },
                  { type: 'DESCRIPTIVE', label: 'Descriptive' },
                  { type: 'CODING', label: 'Coding (Phase 5)' },
                  { type: 'SQL', label: 'SQL Query (Phase 5)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleTypeChange(item.type)}
                  className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                    questionType === item.type
                      ? 'border-blue-600 bg-blue-50/70 text-blue-800 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  data-testid={`type-btn-${item.type}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coding / SQL Phase 5 note */}
          {(questionType === 'CODING' || questionType === 'SQL') && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Phase 5 Note:</strong> Coding sandbox runner and automated unit test
                execution will be fully activated in Phase 5. Questions created here will be stored
                in the Question Bank.
              </span>
            </div>
          )}

          {/* Grid: Topic, Difficulty, Marks, Negative Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Topic */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Topic Category <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="topic-options-list"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Data Structures, Algorithms"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.topic ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-question-topic"
              />
              <datalist id="topic-options-list">
                {topicOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {errors.topic && <p className="text-xs text-rose-600 mt-1">{errors.topic}</p>}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty Tier <span className="text-rose-500">*</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-question-difficulty"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Maximum Marks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Marks <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maximumMarks}
                onChange={(e) => setMaximumMarks(Number(e.target.value))}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maximumMarks ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-max-marks"
              />
              {errors.maximumMarks && (
                <p className="text-xs text-rose-600 mt-1">{errors.maximumMarks}</p>
              )}
            </div>

            {/* Negative Marks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Negative Marks (0 if none)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="50"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value))}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.negativeMarks ? 'border-rose-400' : 'border-slate-300'
                }`}
                data-testid="input-negative-marks"
              />
              {errors.negativeMarks && (
                <p className="text-xs text-rose-600 mt-1">{errors.negativeMarks}</p>
              )}
            </div>
          </div>

          {/* Question Text Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Statement / Problem Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="State the question clearly..."
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.questionText ? 'border-rose-400' : 'border-slate-300'
              }`}
              data-testid="textarea-question-text"
            />
            {errors.questionText && (
              <p className="text-xs text-rose-600 mt-1">{errors.questionText}</p>
            )}
          </div>

          {/* Code Snippet (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Reference Code Snippet (Optional)</span>
            </label>
            <textarea
              rows={3}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="e.g. function findMedian(arr) { ... }"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="textarea-code-snippet"
            />
          </div>

          {/* Dynamic Options Editor for MCQ / True False */}
          {isObjective && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Answer Options
                  </h4>
                  <p className="text-xs text-slate-500">
                    {questionType === 'MCQ_SINGLE' || questionType === 'TRUE_FALSE'
                      ? 'Select the radio button next to the correct answer.'
                      : 'Check all options that are considered correct.'}
                  </p>
                </div>

                {questionType !== 'TRUE_FALSE' && options.length < 8 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    data-testid="btn-add-option"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                )}
              </div>

              {errors.options && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.options}</span>
                </div>
              )}

              <div className="space-y-2">
                {options.map((option, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200"
                    data-testid={`option-row-${idx}`}
                  >
                    {/* Correct Selector (Radio or Checkbox) */}
                    <input
                      type={questionType === 'MCQ_MULTIPLE' ? 'checkbox' : 'radio'}
                      name="correct-option-group"
                      checked={option.isCorrect}
                      onChange={() => handleOptionCorrectToggle(idx)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      title="Mark as correct answer"
                      data-testid={`option-correct-${idx}`}
                    />

                    {/* Option Text Input */}
                    <input
                      type="text"
                      disabled={questionType === 'TRUE_FALSE'}
                      value={option.optionText}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      data-testid={`option-input-${idx}`}
                    />

                    {/* Correct badge */}
                    {option.isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Correct
                      </span>
                    )}

                    {/* Remove Option Button */}
                    {questionType !== 'TRUE_FALSE' && options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        title="Remove option"
                        data-testid={`option-remove-${idx}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation / Rubric (Admin-only) */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Evaluator Explanation / Solution Notes (Admin-only)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Rationale for the correct answer, evaluation criteria, or grading key..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="textarea-explanation"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strictly protected: Candidates are never provided with solution keys or explanations
              (Rule 2).
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              data-testid="btn-submit-question"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Question...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Question Changes' : 'Add to Question Bank'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
