/**
 * 4-Step Create Assessment Wizard
 * Traceability: FR-ASMT-001..008, Decision 5, Rule 1, UI_Sample.jpeg
 */

import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  Layers,
  HelpCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  PlayCircle,
  Save,
  Sliders,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import {
  QuestionRecord,
  CreateAssessmentPayload,
  NavigationMode,
  ResultVisibility,
} from '../../types/api';

interface AssessmentWizardProps {
  availableQuestions: QuestionRecord[];
  onCancel: () => void;
  onSubmit: (payload: CreateAssessmentPayload, publishImmediately: boolean) => Promise<void>;
}

interface SelectedQuestionItem {
  question: QuestionRecord;
  sequenceNumber: number;
  timeLimitSeconds: number; // 0 = unconstrained
  marksOverride: number;
}

const STEPS = [
  { id: 1, label: 'Basic Details', icon: Layers },
  { id: 2, label: 'Select Questions', icon: HelpCircle },
  { id: 3, label: 'Settings & Rules', icon: Sliders },
  { id: 4, label: 'Review & Publish', icon: FileCheck },
];

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  availableQuestions,
  onCancel,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Basic Details
  const [title, setTitle] = useState('');
  const [roleCategory, setRoleCategory] = useState('Frontend Engineering');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
    'Please ensure you have a stable network connection. Once started, the timer cannot be paused.',
  );
  const [overallDuration, setOverallDuration] = useState<number>(60); // minutes
  const [startAt, setStartAt] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [endAt, setEndAt] = useState<string>(() => {
    const d = new Date(Date.now() + 26 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });

  // Step 2: Selected Questions
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestionItem[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionTopicFilter, setQuestionTopicFilter] = useState('ALL');

  // Step 3: Settings (Decision 5)
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState<number>(0.25);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('SEQUENTIAL');
  const [resultVisibility, setResultVisibility] = useState<ResultVisibility>('ADMIN_RELEASE');
  const [passingMarks, setPassingMarks] = useState<number>(20);
  const [attemptLimit, setAttemptLimit] = useState<number>(1);

  // Step 4: Submission & Publish Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Computed metrics
  const totalMarks = selectedQuestions.reduce((acc, q) => acc + q.marksOverride, 0);
  const totalPerQuestionSeconds = selectedQuestions.reduce((acc, q) => acc + q.timeLimitSeconds, 0);
  const totalQuestionMinutes = Math.ceil(totalPerQuestionSeconds / 60);

  // Server & Client rule: sum of question limits <= overall duration
  const exceedsDuration =
    totalPerQuestionSeconds > 0 && totalPerQuestionSeconds > overallDuration * 60;

  // Validation logic per step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) newErrors.title = 'Assessment title is required.';
      if (!roleCategory.trim()) newErrors.roleCategory = 'Role category is required.';
      if (overallDuration <= 0)
        newErrors.overallDuration = 'Overall duration must be at least 1 minute.';
      if (new Date(startAt) >= new Date(endAt)) {
        newErrors.schedule = 'End time must be after the start time.';
      }
    }

    if (step === 2) {
      if (selectedQuestions.length === 0) {
        newErrors.questions = 'Select at least one question for this assessment.';
      }
    }

    if (step === 3) {
      if (negativeMarking && negativeMarkValue <= 0) {
        newErrors.negativeMarks = 'Negative mark penalty must be greater than 0.';
      }
      if (passingMarks > totalMarks && totalMarks > 0) {
        newErrors.passingMarks = `Passing marks (${passingMarks}) cannot exceed total marks (${totalMarks}).`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 2 && totalMarks > 0 && passingMarks > totalMarks) {
      setPassingMarks(Math.max(1, Math.floor(totalMarks * 0.4)));
    }
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Step 2 Question Handlers
  const handleToggleAddQuestion = (q: QuestionRecord) => {
    const existingIndex = selectedQuestions.findIndex((item) => item.question.id === q.id);
    if (existingIndex >= 0) {
      setSelectedQuestions(selectedQuestions.filter((item) => item.question.id !== q.id));
    } else {
      setSelectedQuestions([
        ...selectedQuestions,
        {
          question: q,
          sequenceNumber: selectedQuestions.length + 1,
          timeLimitSeconds: 60, // default 60s
          marksOverride: q.maximumMarks,
        },
      ]);
    }
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedQuestions.length) return;

    const updated = [...selectedQuestions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reindexed = updated.map((item, i) => ({
      ...item,
      sequenceNumber: i + 1,
    }));
    setSelectedQuestions(reindexed);
  };

  const handleUpdateQuestionLimit = (index: number, seconds: number) => {
    const updated = [...selectedQuestions];
    updated[index].timeLimitSeconds = Math.max(0, seconds);
    setSelectedQuestions(updated);
  };

  const handleUpdateQuestionMarks = (index: number, marks: number) => {
    const updated = [...selectedQuestions];
    updated[index].marksOverride = Math.max(1, marks);
    setSelectedQuestions(updated);
  };

  const handleSaveAssessment = async (publishImmediately: boolean) => {
    if (exceedsDuration) {
      setErrors({
        duration: `Sum of question time limits (${totalQuestionMinutes}m) exceeds overall duration (${overallDuration}m).`,
      });
      return;
    }

    const payload: CreateAssessmentPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      roleCategory: roleCategory.trim(),
      overallDuration: Number(overallDuration),
      totalMarks,
      passingMarks: Number(passingMarks) || undefined,
      negativeMarking,
      negativeMarkValue: negativeMarking ? Number(negativeMarkValue) : 0,
      randomizeQuestions,
      randomizeOptions,
      navigationMode,
      resultVisibility,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      attemptLimit: Number(attemptLimit) || 1,
      questions: selectedQuestions.map((item) => ({
        questionId: item.question.id,
        sequenceNumber: item.sequenceNumber,
        timeLimitSeconds: item.timeLimitSeconds > 0 ? item.timeLimitSeconds : undefined,
        marksOverride: item.marksOverride,
      })),
    };

    try {
      setIsSubmitting(true);
      await onSubmit(payload, publishImmediately);
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
      setShowPublishConfirm(false);
    }
  };

  // Filter available questions for Step 2
  const filteredAvailableQuestions = availableQuestions.filter((q) => {
    const matchesSearch =
      questionSearch === '' ||
      q.questionText.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.topic.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesTopic = questionTopicFilter === 'ALL' || q.topic === questionTopicFilter;
    return matchesSearch && matchesTopic;
  });

  const allTopics = Array.from(new Set(availableQuestions.map((q) => q.topic)));

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      data-testid="assessment-wizard"
    >
      {/* Wizard Step Indicator Header */}
      <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Create New Assessment</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {currentStep} of 4: {STEPS[currentStep - 1].label} (FR-ASMT-001..008, Decision 5)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel & Exit
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                  isCurrent
                    ? 'bg-blue-600/30 border-blue-500 text-white font-semibold'
                    : isCompleted
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                }`}
                data-testid={`wizard-step-tab-${step.id}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="truncate hidden sm:inline">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Step Content */}
      <div className="p-6 md:p-8 space-y-6">
        {/* ======================================================== */}
        {/* STEP 1: BASIC DETAILS                                    */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-5 max-w-3xl" data-testid="step-basic-details">
            <div>
              <h3 className="text-base font-bold text-slate-900">Assessment Basics</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the assessment title, job role category, duration, and schedule window.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assessment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer Screening Test"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-rose-400' : 'border-slate-300'
                  }`}
                  data-testid="input-assessment-title"
                />
                {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
              </div>

              {/* Role Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="role-list"
                  value={roleCategory}
                  onChange={(e) => setRoleCategory(e.target.value)}
                  placeholder="e.g. Frontend Engineering"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-role-category"
                />
                <datalist id="role-list">
                  <option value="Frontend Engineering" />
                  <option value="Backend Engineering" />
                  <option value="Full Stack Development" />
                  <option value="Data & Analytics" />
                  <option value="QA & Automation" />
                </datalist>
              </div>

              {/* Overall Duration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Duration (Minutes) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={overallDuration}
                  onChange={(e) => setOverallDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-overall-duration"
                />
                {errors.overallDuration && (
                  <p className="text-xs text-rose-600 mt-1">{errors.overallDuration}</p>
                )}
              </div>

              {/* Schedule Window Start */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Start Window (UTC) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-start-at"
                />
              </div>

              {/* Schedule Window End */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule End Window (UTC) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-end-at"
                />
              </div>

              {errors.schedule && (
                <div className="sm:col-span-2 text-xs text-rose-600 p-2 bg-rose-50 rounded-lg border border-rose-200">
                  {errors.schedule}
                </div>
              )}

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assessment Overview / Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of skills and competencies evaluated..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="textarea-description"
                />
              </div>

              {/* Candidate Instructions */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Test Instructions (Shown prior to start)
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="textarea-instructions"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SELECT QUESTIONS                                 */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6" data-testid="step-select-questions">
            <div>
              <h3 className="text-base font-bold text-slate-900">Select & Configure Questions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick questions from the repository, arrange presentation sequence, and set
                per-question timers.
              </p>
            </div>

            {errors.questions && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errors.questions}</span>
              </div>
            )}

            {/* Metrics summary banner */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Questions Selected</span>
                <span
                  className="text-lg font-bold text-blue-900 mt-0.5 block"
                  data-testid="selected-count"
                >
                  {selectedQuestions.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Marks</span>
                <span
                  className="text-lg font-bold text-blue-900 mt-0.5 block"
                  data-testid="total-marks"
                >
                  {totalMarks} marks
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Individual Question Timers</span>
                <span className="text-lg font-bold text-blue-900 mt-0.5 block">
                  {totalQuestionMinutes} mins ({totalPerQuestionSeconds}s)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Question Repository Browser */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Available Question Repository
                </h4>

                {/* Filter and search */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search available questions..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                  <select
                    value={questionTopicFilter}
                    onChange={(e) => setQuestionTopicFilter(e.target.value)}
                    className="py-1.5 px-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="ALL">All Topics</option>
                    {allTopics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question List */}
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {filteredAvailableQuestions.map((q) => {
                    const isSelected = selectedQuestions.some((item) => item.question.id === q.id);

                    return (
                      <div
                        key={q.id}
                        className={`p-3 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                        }`}
                        data-testid={`available-question-${q.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {q.id}
                              </span>
                              <span className="text-[11px] font-medium text-slate-600">
                                {q.topic}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  q.difficulty === 'Easy'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : q.difficulty === 'Medium'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                +{q.maximumMarks}m
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 line-clamp-2">{q.questionText}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleAddQuestion(q)}
                            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                            data-testid={`btn-select-q-${q.id}`}
                          >
                            {isSelected ? (
                              <Trash2 className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected & Ordered Sequence */}
              <div className="lg:col-span-6 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Test Sequence & Timers ({selectedQuestions.length})
                </h4>

                {selectedQuestions.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    No questions added yet. Pick questions from the left repository.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {selectedQuestions.map((item, idx) => (
                      <div
                        key={item.question.id}
                        className="p-3 bg-white space-y-2 hover:bg-slate-50 transition-colors"
                        data-testid={`selected-q-${item.question.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                              {item.sequenceNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                              {item.question.questionText}
                            </span>
                          </div>

                          {/* Reordering Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move question up"
                              data-testid={`btn-move-up-${item.question.id}`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedQuestions.length - 1}
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move question down"
                              data-testid={`btn-move-down-${item.question.id}`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAddQuestion(item.question)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Per-question Time Limit and Marks Override */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Timer:</span>
                            <input
                              type="number"
                              min="0"
                              step="15"
                              value={item.timeLimitSeconds}
                              onChange={(e) =>
                                handleUpdateQuestionLimit(idx, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 rounded font-mono"
                              data-testid={`input-timer-${item.question.id}`}
                            />
                            <span className="text-slate-400">sec (0=none)</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span>Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.marksOverride}
                              onChange={(e) =>
                                handleUpdateQuestionMarks(idx, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-12 px-1.5 py-0.5 text-xs border border-slate-300 rounded font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: SETTINGS & RULES (Decision 5)                     */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl" data-testid="step-settings">
            <div>
              <h3 className="text-base font-bold text-slate-900">Assessment Delivery Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure negative marking, question and option randomization, navigation flow, and
                result visibility policies (Decision 5).
              </p>
            </div>

            <div className="space-y-4">
              {/* Negative Marking Toggle */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-900">Negative Marking</h4>
                  <p className="text-xs text-slate-500">
                    Deduct penalty points for incorrect answers to discourage random guessing.
                  </p>

                  {negativeMarking && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-700 font-medium">
                        Penalty per incorrect answer:
                      </span>
                      <input
                        type="number"
                        step="0.25"
                        min="0.1"
                        max="5"
                        value={negativeMarkValue}
                        onChange={(e) => setNegativeMarkValue(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        data-testid="input-negative-val"
                      />
                      <span className="text-xs text-slate-500">marks</span>
                    </div>
                  )}
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.checked)}
                    className="sr-only peer"
                    data-testid="toggle-negative-marking"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Randomization Policies */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Anti-Cheat Randomization</h4>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Randomize Question Presentation Order
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Each candidate receives questions in a distinct deterministic pseudorandom
                      sequence.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    data-testid="toggle-randomize-questions"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Randomize MCQ Option Choices
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Option choices (A, B, C, D) are shuffled dynamically per candidate attempt.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    data-testid="toggle-randomize-options"
                  />
                </div>
              </div>

              {/* Navigation Mode */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Navigation Mode</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNavigationMode('SEQUENTIAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      navigationMode === 'SEQUENTIAL'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    data-testid="nav-mode-sequential"
                  >
                    <span className="text-xs font-bold text-slate-900 block">
                      Sequential Navigation (Strict)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Candidate proceeds question-by-question and cannot return to previous answers.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNavigationMode('FREE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      navigationMode === 'FREE'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    data-testid="nav-mode-free"
                  >
                    <span className="text-xs font-bold text-slate-900 block">Free Navigation</span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Candidate can freely skip, revisit, and modify answers before final
                      submission.
                    </span>
                  </button>
                </div>
              </div>

              {/* Result Visibility Policy */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Result Visibility Policy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        val: 'IMMEDIATE',
                        label: 'Immediate',
                        desc: 'Scores shown right after test submission.',
                      },
                      {
                        val: 'SCHEDULED',
                        label: 'Scheduled Window',
                        desc: 'Released automatically when assessment window closes.',
                      },
                      {
                        val: 'ADMIN_RELEASE',
                        label: 'Admin Release (Standard)',
                        desc: 'Withheld until manual administrative publication.',
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setResultVisibility(item.val)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        resultVisibility === item.val
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      data-testid={`vis-policy-${item.val}`}
                    >
                      <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                      <span className="text-[11px] text-slate-500 mt-1 block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Passing Marks and Attempt Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Passing Score (Marks)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalMarks || 100}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white"
                    data-testid="input-passing-marks"
                  />
                  {errors.passingMarks && (
                    <p className="text-xs text-rose-600 mt-1">{errors.passingMarks}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attempt Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={attemptLimit}
                    onChange={(e) => setAttemptLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white"
                    data-testid="input-attempt-limit"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: REVIEW & PUBLISH                                 */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl" data-testid="step-review-publish">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Review Assessment Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify test parameters before saving as draft or publishing to active candidates.
              </p>
            </div>

            {/* BLOCKING VALIDATION BANNER: Question Limit vs Overall Duration */}
            {exceedsDuration && (
              <div
                className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900"
                data-testid="duration-validation-error"
              >
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Duration Policy Violation</h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    The sum of configured per-question time limits is{' '}
                    <strong>{totalQuestionMinutes} minutes</strong> ({totalPerQuestionSeconds}{' '}
                    seconds), which exceeds the total assessment duration of{' '}
                    <strong>{overallDuration} minutes</strong> ({overallDuration * 60} seconds).
                    Please return to Step 2 to lower individual timers, or adjust the overall
                    duration in Step 1.
                  </p>
                </div>
              </div>
            )}

            {/* Assessment Specification Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                    {roleCategory}
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1">{title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{description}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500 block">Overall Duration</span>
                  <span className="text-base font-bold text-slate-900">{overallDuration} mins</span>
                </div>
              </div>

              {/* Schedule and Question Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Questions</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {selectedQuestions.length} items
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Marks</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {totalMarks} marks
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Passing Marks</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {passingMarks} marks
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Navigation Flow</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {navigationMode}
                  </span>
                </div>
              </div>

              {/* Policy Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Negative Marking:{' '}
                  {negativeMarking ? `Enabled (-${negativeMarkValue})` : 'Disabled'}
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Question Shuffle: {randomizeQuestions ? 'Yes' : 'No'}
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Option Shuffle: {randomizeOptions ? 'Yes' : 'No'}
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Result Policy: {resultVisibility}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-blue-950">Ready to save or publish?</h5>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Publishing creates an immutable version snapshot (FR-ASMT-003).
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={exceedsDuration || isSubmitting}
                  onClick={() => handleSaveAssessment(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-40"
                  data-testid="btn-save-draft"
                >
                  <Save className="w-4 h-4" />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  disabled={exceedsDuration || isSubmitting}
                  onClick={() => setShowPublishConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-40"
                  data-testid="btn-publish-wizard"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Publish Assessment</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Navigation Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={handlePrevStep}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="wizard-btn-prev"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        {currentStep < 4 && (
          <button
            type="button"
            onClick={handleNextStep}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            data-testid="wizard-btn-next"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          data-testid="publish-confirm-modal"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish Assessment?</h3>
                <p className="text-xs text-slate-500">Immutable snapshot freeze (FR-ASMT-003)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Publishing will freeze this assessment into an immutable version snapshot. Once
              published, question mapping and grading parameters cannot be modified to guarantee
              uniform candidate fairness.
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveAssessment(true)}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                data-testid="btn-confirm-publish"
              >
                {isSubmitting ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
