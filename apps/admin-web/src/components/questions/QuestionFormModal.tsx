/**
 * Question Authoring Modal with Dynamic Type Switcher, Coding & SQL Sandbox Config
 * Traceability: FR-QB-001..010, FR-CODE-001..010, FR-SQL-001..005, Rule 2, UI_Sample.jpeg
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Code2,
  Database,
  Cpu,
  Clock,
  Lock,
  Layers,
  Terminal,
} from 'lucide-react';
import {
  QuestionRecord,
  QuestionInput,
  QuestionType,
  QuestionDifficulty,
  QuestionOption,
  QuestionTestCase,
  SupportedLanguage,
  SqlComparisonMode,
} from '../../types/api';

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: QuestionRecord | null;
  onSubmit: (data: QuestionInput) => Promise<void>;
  topicOptions: string[];
}

interface EditableSampleTestCase {
  inputData: string;
  expectedOutput: string;
}

interface EditableHiddenTestCase {
  inputData: string;
  expectedOutput: string;
  marks: number;
}

const ALL_LANGUAGES: { id: SupportedLanguage; label: string }[] = [
  { id: 'c', label: 'C (GCC 13.2)' },
  { id: 'cpp', label: 'C++ (G++ 20)' },
  { id: 'java', label: 'Java (OpenJDK 21)' },
  { id: 'python', label: 'Python (3.11)' },
  { id: 'javascript', label: 'JavaScript (Node 20)' },
];

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  onSubmit,
  topicOptions,
}) => {
  const isEditing = Boolean(questionToEdit);

  // Common Question Fields
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ_SINGLE');
  const [topic, setTopic] = useState('Data Structures');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [maximumMarks, setMaximumMarks] = useState<number>(2);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.5);
  const [questionText, setQuestionText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [explanation, setExplanation] = useState('');

  // Objective Options
  const [options, setOptions] = useState<QuestionOption[]>([
    { optionText: '', displayOrder: 1, isCorrect: true },
    { optionText: '', displayOrder: 2, isCorrect: false },
    { optionText: '', displayOrder: 3, isCorrect: false },
    { optionText: '', displayOrder: 4, isCorrect: false },
  ]);

  // Coding Specific Fields (FR-CODE-001..010)
  const [allowedLanguages, setAllowedLanguages] = useState<SupportedLanguage[]>([
    'c',
    'cpp',
    'java',
    'python',
    'javascript',
  ]);
  const [timeLimitMs, setTimeLimitMs] = useState<number>(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [maxSubmissions, setMaxSubmissions] = useState<number>(5);
  const [sampleTestCases, setSampleTestCases] = useState<EditableSampleTestCase[]>([
    { inputData: '3 5\n', expectedOutput: '8' },
  ]);
  const [hiddenTestCases, setHiddenTestCases] = useState<EditableHiddenTestCase[]>([
    { inputData: '100 250\n', expectedOutput: '350', marks: 5 },
  ]);

  // SQL Specific Fields (FR-SQL-001..005)
  const [schemaDdl, setSchemaDdl] = useState<string>(
    'CREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  department TEXT NOT NULL,\n  salary INTEGER NOT NULL\n);',
  );
  const [seedDataSql, setSeedDataSql] = useState<string>(
    "INSERT INTO employees (name, department, salary) VALUES\n  ('Alice Smith', 'Engineering', 95000),\n  ('Bob Jones', 'Engineering', 85000),\n  ('Charlie Brown', 'HR', 65000);",
  );
  const [referenceQuery, setReferenceQuery] = useState<string>(
    'SELECT department, COUNT(*) as emp_count\nFROM employees\nGROUP BY department\nORDER BY department ASC;',
  );
  const [comparisonMode, setComparisonMode] = useState<SqlComparisonMode>('EXACT_MATCH');

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

      // Options
      setOptions(
        questionToEdit.options && questionToEdit.options.length > 0
          ? questionToEdit.options
          : [
              { optionText: '', displayOrder: 1, isCorrect: false },
              { optionText: '', displayOrder: 2, isCorrect: false },
            ],
      );

      // Coding Config
      if (questionToEdit.codingConfig) {
        setAllowedLanguages(questionToEdit.codingConfig.allowedLanguages || ['python', 'javascript']);
        setTimeLimitMs(questionToEdit.codingConfig.timeLimitMs || 2000);
        setMemoryLimitMb(questionToEdit.codingConfig.memoryLimitMb || 256);
        setMaxSubmissions(questionToEdit.codingConfig.maxSubmissions || 5);
      }

      // Test cases
      if (questionToEdit.testCases && questionToEdit.testCases.length > 0) {
        const samples = questionToEdit.testCases
          .filter((tc) => tc.visibility === 'SAMPLE')
          .map((tc) => ({ inputData: tc.inputData, expectedOutput: tc.expectedOutput }));
        const hiddens = questionToEdit.testCases
          .filter((tc) => tc.visibility === 'HIDDEN')
          .map((tc) => ({ inputData: tc.inputData, expectedOutput: tc.expectedOutput, marks: tc.marks || 1 }));

        if (samples.length > 0) setSampleTestCases(samples);
        if (hiddens.length > 0) setHiddenTestCases(hiddens);
      }

      // SQL Config
      if (questionToEdit.sqlConfig) {
        setSchemaDdl(questionToEdit.sqlConfig.schemaDdl || '');
        setSeedDataSql(questionToEdit.sqlConfig.seedDataSql || '');
        setReferenceQuery(questionToEdit.sqlConfig.referenceQuery || '');
        setComparisonMode(questionToEdit.sqlConfig.comparisonMode || 'EXACT_MATCH');
      }
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
      setAllowedLanguages(['c', 'cpp', 'java', 'python', 'javascript']);
      setTimeLimitMs(2000);
      setMemoryLimitMb(256);
      setMaxSubmissions(5);
      setSampleTestCases([{ inputData: '3 5\n', expectedOutput: '8' }]);
      setHiddenTestCases([{ inputData: '100 250\n', expectedOutput: '350', marks: 5 }]);
      setComparisonMode('EXACT_MATCH');
    }
    setErrors({});
  }, [questionToEdit, isOpen, topicOptions]);

  // Adjust defaults when switching question types
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
    } else if (newType === 'CODING') {
      setMaximumMarks(10);
      setNegativeMarks(0);
    } else if (newType === 'SQL') {
      setMaximumMarks(10);
      setNegativeMarks(0);
    }
  };

  const handleLanguageToggle = (lang: SupportedLanguage) => {
    if (allowedLanguages.includes(lang)) {
      if (allowedLanguages.length === 1) return; // Must have at least 1 language
      setAllowedLanguages(allowedLanguages.filter((l) => l !== lang));
    } else {
      setAllowedLanguages([...allowedLanguages, lang]);
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].optionText = text;
    setOptions(updated);
  };

  const handleOptionCorrectToggle = (index: number) => {
    if (questionType === 'MCQ_SINGLE' || questionType === 'TRUE_FALSE') {
      const updated = options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      setOptions(updated);
    } else if (questionType === 'MCQ_MULTIPLE') {
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

  // Sample Test Case handlers
  const handleAddSampleCase = () => {
    setSampleTestCases([...sampleTestCases, { inputData: '', expectedOutput: '' }]);
  };

  const handleRemoveSampleCase = (idx: number) => {
    if (sampleTestCases.length <= 1) return;
    setSampleTestCases(sampleTestCases.filter((_, i) => i !== idx));
  };

  const handleUpdateSampleCase = (idx: number, field: keyof EditableSampleTestCase, val: string) => {
    const updated = [...sampleTestCases];
    updated[idx][field] = val;
    setSampleTestCases(updated);
  };

  // Hidden Test Case handlers
  const handleAddHiddenCase = () => {
    setHiddenTestCases([...hiddenTestCases, { inputData: '', expectedOutput: '', marks: 5 }]);
  };

  const handleRemoveHiddenCase = (idx: number) => {
    if (hiddenTestCases.length <= 1) return;
    setHiddenTestCases(hiddenTestCases.filter((_, i) => i !== idx));
  };

  const handleUpdateHiddenCase = (idx: number, field: keyof EditableHiddenTestCase, val: string | number) => {
    const updated = [...hiddenTestCases];
    updated[idx] = { ...updated[idx], [field]: val };
    setHiddenTestCases(updated);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!questionText.trim()) {
      newErrors.questionText = 'Question prompt statement is required.';
    }
    if (!topic.trim()) {
      newErrors.topic = 'Question topic category is required.';
    }
    if (maximumMarks <= 0) {
      newErrors.maximumMarks = 'Maximum marks must be greater than 0.';
    }

    const isObjective =
      questionType === 'MCQ_SINGLE' ||
      questionType === 'MCQ_MULTIPLE' ||
      questionType === 'TRUE_FALSE';

    if (isObjective) {
      const validOptions = options.filter((o) => o.optionText.trim().length > 0);
      if (validOptions.length < 2) {
        newErrors.options = 'At least 2 options with non-empty text are required.';
      }
      const hasCorrect = validOptions.some((o) => o.isCorrect);
      if (!hasCorrect) {
        newErrors.options = 'At least one option must be marked as the correct answer.';
      }
    }

    if (questionType === 'CODING') {
      if (allowedLanguages.length === 0) {
        newErrors.languages = 'Select at least one permitted programming language.';
      }
      if (timeLimitMs < 100 || timeLimitMs > 10000) {
        newErrors.timeLimit = 'Time limit must be between 100ms and 10000ms.';
      }
      if (memoryLimitMb < 32 || memoryLimitMb > 512) {
        newErrors.memoryLimit = 'Memory limit must be between 32MB and 512MB.';
      }
      if (sampleTestCases.length === 0 && hiddenTestCases.length === 0) {
        newErrors.testCases = 'At least one test case must be specified.';
      }
    }

    if (questionType === 'SQL') {
      if (!schemaDdl.trim()) {
        newErrors.schemaDdl = 'Schema DDL statement is required to create assessment tables.';
      }
      if (!referenceQuery.trim()) {
        newErrors.referenceQuery = 'Reference SQL query is required to compute expected output.';
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

    // Build Test Cases for Coding
    const assembledTestCases: QuestionTestCase[] = [];
    if (questionType === 'CODING') {
      sampleTestCases.forEach((stc, idx) => {
        assembledTestCases.push({
          id: `sample-tc-${idx + 1}`,
          inputData: stc.inputData,
          expectedOutput: stc.expectedOutput,
          visibility: 'SAMPLE',
          marks: 0,
        });
      });
      hiddenTestCases.forEach((htc, idx) => {
        assembledTestCases.push({
          id: `hidden-tc-${idx + 1}`,
          inputData: htc.inputData,
          expectedOutput: htc.expectedOutput,
          visibility: 'HIDDEN',
          marks: Number(htc.marks) || 1,
        });
      });
    }

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
      testCases: assembledTestCases.length > 0 ? assembledTestCases : undefined,
      codingConfig:
        questionType === 'CODING'
          ? {
              allowedLanguages,
              timeLimitMs: Number(timeLimitMs),
              memoryLimitMb: Number(memoryLimitMb),
              maxSubmissions: Number(maxSubmissions),
            }
          : undefined,
      sqlConfig:
        questionType === 'SQL'
          ? {
              schemaDdl: schemaDdl.trim(),
              seedDataSql: seedDataSql.trim(),
              referenceQuery: referenceQuery.trim(),
              comparisonMode,
            }
          : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div data-testid="question-form-modal" className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              {questionType === 'CODING' ? (
                <Terminal className="w-4 h-4" />
              ) : questionType === 'SQL' ? (
                <Database className="w-4 h-4" />
              ) : (
                <Code2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Question Definition' : 'Author New Assessment Question'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive question authoring: MCQ, Subjective, Coding & SQL (FR-QB-001..010, FR-CODE, FR-SQL)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Dynamic Question Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Question Format / Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { type: 'MCQ_SINGLE', label: 'Single Choice MCQ' },
                  { type: 'MCQ_MULTIPLE', label: 'Multiple Choice MCQ' },
                  { type: 'TRUE_FALSE', label: 'True / False' },
                  { type: 'SHORT_ANSWER', label: 'Short Answer' },
                  { type: 'DESCRIPTIVE', label: 'Descriptive' },
                  { type: 'SCENARIO', label: 'Scenario / Design' },
                  { type: 'CODING', label: 'Coding Sandbox' },
                  { type: 'SQL', label: 'SQL Query Sandbox' },
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
                placeholder="e.g. Data Structures, Algorithms, SQL"
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

            {/* Max Marks */}
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
          </div>

          {/* Question Text Prompt Statement */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Statement / Problem Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="State the problem prompt, requirements, and constraints clearly..."
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.questionText ? 'border-rose-400' : 'border-slate-300'
              }`}
              data-testid="textarea-question-text"
            />
            {errors.questionText && (
              <p className="text-xs text-rose-600 mt-1">{errors.questionText}</p>
            )}
          </div>

          {/* Reference Code Snippet (Optional for objective / subjective) */}
          {questionType !== 'CODING' && questionType !== 'SQL' && (
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
          )}

          {/* ============================================================== */}
          {/* SECTION A: CODING PROBLEM CONFIGURATION (FR-CODE-001..010) */}
          {/* ============================================================== */}
          {questionType === 'CODING' && (
            <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Coding Sandbox Configuration (FR-CODE-001..010, SRS 10.4)
                </h4>
              </div>

              {/* 1. Permitted Languages Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Allowed Execution Languages <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_LANGUAGES.map((lang) => {
                    const isChecked = allowedLanguages.includes(lang.id);
                    return (
                      <label
                        key={lang.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          isChecked
                            ? 'border-blue-500 bg-blue-50/60 text-blue-900'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                        }`}
                        data-testid={`checkbox-lang-${lang.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleLanguageToggle(lang.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span>{lang.label}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.languages && (
                  <p className="text-xs text-rose-600 mt-1">{errors.languages}</p>
                )}
              </div>

              {/* 2. Resource Execution Limits (FR-CODE-006, FR-CODE-010) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Time Limit (ms)</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={timeLimitMs}
                    onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    data-testid="input-time-limit-ms"
                  />
                  <span className="text-[10px] text-slate-400">Default: 2000ms</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-400" />
                    <span>Memory Limit (MB)</span>
                  </label>
                  <input
                    type="number"
                    min="32"
                    max="512"
                    step="32"
                    value={memoryLimitMb}
                    onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    data-testid="input-memory-limit-mb"
                  />
                  <span className="text-[10px] text-slate-400">Default: 256MB</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>Max Submissions</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxSubmissions}
                    onChange={(e) => setMaxSubmissions(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    data-testid="input-max-submissions"
                  />
                  <span className="text-[10px] text-slate-400">Default: 5 (FR-CODE-010)</span>
                </div>
              </div>

              {/* 3. Sample Test Cases (FR-CODE-003, Candidate Visible) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Sample Test Cases (Visible to Candidates - FR-CODE-003)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Inputs and expected outputs are disclosed in candidate exam interface for testing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSampleCase}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    data-testid="btn-add-sample-case"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Sample Case</span>
                  </button>
                </div>

                {sampleTestCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                    data-testid={`sample-case-row-${idx}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Sample Case #{idx + 1}
                      </span>
                      {sampleTestCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSampleCase(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove sample case"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Input Data (stdin)</span>
                        <textarea
                          rows={2}
                          value={tc.inputData}
                          onChange={(e) => handleUpdateSampleCase(idx, 'inputData', e.target.value)}
                          className="w-full p-2 font-mono text-xs border border-slate-300 rounded-lg bg-white"
                          data-testid={`input-sample-stdin-${idx}`}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Expected Output (stdout)</span>
                        <textarea
                          rows={2}
                          value={tc.expectedOutput}
                          onChange={(e) => handleUpdateSampleCase(idx, 'expectedOutput', e.target.value)}
                          className="w-full p-2 font-mono text-xs border border-slate-300 rounded-lg bg-white"
                          data-testid={`input-sample-stdout-${idx}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 4. Hidden Test Cases with Marks (FR-CODE-004, FR-CODE-009, Strictly Protected) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Hidden Test Cases (Strictly Protected - FR-CODE-004, FR-CODE-009)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Inputs, outputs, and weights are NEVER returned to candidates (Rule 2).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHiddenCase}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    data-testid="btn-add-hidden-case"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Hidden Case</span>
                  </button>
                </div>

                {hiddenTestCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2"
                    data-testid={`hidden-case-row-${idx}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-900">
                        Hidden Case #{idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-medium">Marks:</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={tc.marks}
                            onChange={(e) => handleUpdateHiddenCase(idx, 'marks', Number(e.target.value))}
                            className="w-14 px-1.5 py-0.5 border border-slate-300 rounded bg-white text-xs font-bold text-center"
                            data-testid={`input-hidden-marks-${idx}`}
                          />
                          <span className="text-[10px] text-slate-400">pts</span>
                        </div>
                        {hiddenTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveHiddenCase(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove hidden case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Input Data (stdin)</span>
                        <textarea
                          rows={2}
                          value={tc.inputData}
                          onChange={(e) => handleUpdateHiddenCase(idx, 'inputData', e.target.value)}
                          className="w-full p-2 font-mono text-xs border border-slate-300 rounded-lg bg-white"
                          data-testid={`input-hidden-stdin-${idx}`}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Expected Output (stdout)</span>
                        <textarea
                          rows={2}
                          value={tc.expectedOutput}
                          onChange={(e) => handleUpdateHiddenCase(idx, 'expectedOutput', e.target.value)}
                          className="w-full p-2 font-mono text-xs border border-slate-300 rounded-lg bg-white"
                          data-testid={`input-hidden-stdout-${idx}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION B: SQL QUERY CONFIGURATION (FR-SQL-001..005) */}
          {/* ============================================================== */}
          {questionType === 'SQL' && (
            <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  SQL Sandbox Configuration (FR-SQL-001..005)
                </h4>
              </div>

              {/* Schema DDL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Schema Definition DDL (CREATE TABLE) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Ephemeral SQLite Sandbox</span>
                </div>
                <textarea
                  rows={3}
                  value={schemaDdl}
                  onChange={(e) => setSchemaDdl(e.target.value)}
                  placeholder="CREATE TABLE employees (...);"
                  className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-emerald-400"
                  data-testid="textarea-sql-schema-ddl"
                />
                {errors.schemaDdl && (
                  <p className="text-xs text-rose-600 mt-1">{errors.schemaDdl}</p>
                )}
              </div>

              {/* Seed Data SQL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seed Data SQL (INSERT INTO statements)
                </label>
                <textarea
                  rows={3}
                  value={seedDataSql}
                  onChange={(e) => setSeedDataSql(e.target.value)}
                  placeholder="INSERT INTO employees VALUES (...);"
                  className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-cyan-400"
                  data-testid="textarea-sql-seed-data"
                />
              </div>

              {/* Reference Query & Comparison Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference Query / Solution Key (Admin-only) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={referenceQuery}
                    onChange={(e) => setReferenceQuery(e.target.value)}
                    placeholder="SELECT ... FROM ... WHERE ...;"
                    className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-amber-300"
                    data-testid="textarea-sql-reference-query"
                  />
                  {errors.referenceQuery && (
                    <p className="text-xs text-rose-600 mt-1">{errors.referenceQuery}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Comparison Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={comparisonMode}
                    onChange={(e) => setComparisonMode(e.target.value as SqlComparisonMode)}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    data-testid="select-sql-comparison-mode"
                  >
                    <option value="EXACT_MATCH">Exact Match (Ordered)</option>
                    <option value="UNORDERED_MATCH">Unordered Match (Bag)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {comparisonMode === 'EXACT_MATCH'
                      ? 'Rows must match exact order.'
                      : 'Candidate query output rows may arrive in any order.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION C: DYNAMIC OPTIONS EDITOR FOR MCQ / TRUE-FALSE */}
          {/* ============================================================== */}
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
                    <input
                      type={questionType === 'MCQ_MULTIPLE' ? 'checkbox' : 'radio'}
                      name="correct-option-group"
                      checked={option.isCorrect}
                      onChange={() => handleOptionCorrectToggle(idx)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      title="Mark as correct answer"
                      data-testid={`option-correct-${idx}`}
                    />

                    <input
                      type="text"
                      value={option.optionText}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid={`option-input-${idx}`}
                    />

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

          {/* Explanation / Solution Notes */}
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
              Strictly protected: Candidates are never provided with solution keys or explanations (Rule 2).
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
