import React, { useState } from 'react';
import { Play, Check, AlertCircle, Bookmark } from 'lucide-react';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { apiClient } from '../services/apiClient';
import { MockAssessmentSession, MockQuestion } from '../services/mockApi';

/**
 * Exam Interface Screen
 * Faithfully matches docs/design/UI_Sample.jpeg (Screen 4: Exam Interface MCQ / CODING / SQL)
 * Reconciled via docs/DECISIONS.md:
 * - Decision 1: Question palette is strictly a read-only status indicator in sequential mode
 * - Decision 1: "Previous" button is hidden in sequential mode (FR-UI-005)
 * - Decision 4: "Mark for Review" is a local visual aid only (does not alter server attempt state)
 * - FR-ANS-009: Submissions send a client-generated Idempotency-Key header
 * - FR-UI-006: Multiple-submission / double-click protection
 */

interface ExamScreenProps {
  session: MockAssessmentSession;
  onFinishExam: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({ session, onFinishExam }) => {
  const [currentIdx, setCurrentIdx] = useState(session.currentQuestionIndex || 0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, unknown>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set(session.answeredAttemptIds));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEndTestModal, setShowEndTestModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);

  const currentQuestion: MockQuestion = session.questions[currentIdx] || session.questions[0];
  const qAttemptId = currentQuestion.attemptId;

  // Local answer state for current question
  const currentAnswer = selectedAnswers[qAttemptId];

  const handleSelectOption = (optId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: optId }));
  };

  const handleCodeChange = (text: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: text }));
  };

  const handleToggleMarkReview = () => {
    setMarkedForReview((prev) => ({ ...prev, [qAttemptId]: !prev[qAttemptId] }));
  };

  const handleRunCode = () => {
    // Local dry-run of sample test cases (FR-CODE-003)
    if (currentQuestion.type === 'coding') {
      setCodeOutput(
        'Running sample test cases...\nTest 1 (n=10): Passed (Output: 17, Expected: 17)\nAll visible sample cases passed.',
      );
    } else if (currentQuestion.type === 'sql') {
      setCodeOutput(
        'Executing query on ephemeral SQLite instance...\n| SecondHighestSalary |\n| 200                 |\n1 row returned (4ms).',
      );
    }
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitting) return; // Multiple-click prevention (FR-UI-006)
    setIsSubmitting(true);
    setErrorMessage(null);

    const answerPayload = {
      questionAttemptId: qAttemptId,
      response:
        currentAnswer ??
        (currentQuestion.type === 'coding' ? currentQuestion.codeSnippet : 'no_response'),
    };

    try {
      // Rule 3 & FR-ANS-009: Client-generated idempotency key UUID
      const idempotencyKey = crypto.randomUUID();
      await apiClient.submitAnswer(answerPayload, idempotencyKey);

      setAnsweredIds((prev) => new Set(prev).add(qAttemptId));

      // Advance to next question in sequential sequence (FR-TIME-009)
      if (currentIdx + 1 < session.questions.length) {
        setCurrentIdx((prev) => prev + 1);
        setCodeOutput(null);
      } else {
        // Last question reached; prompt final submission confirmation
        setShowEndTestModal(true);
      }
    } catch (err: unknown) {
      const errRes = err as { message?: string };
      setErrorMessage(errRes?.message || 'Submission failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.finalSubmit(session.sessionId);
      onFinishExam();
    } finally {
      setIsSubmitting(false);
      setShowEndTestModal(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar with authoritative countdown timer & End Test button */}
      <ConnectionBanner
        assessmentTitle={session.title}
        deadlineIsoUtc={session.overallDeadlineAt}
        candidateId={session.candidateId}
        showTimer={true}
        onEndTest={() => setShowEndTestModal(true)}
      />

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Question Palette (Read-Only Status Indicator per Decision 1) */}
        <aside
          style={{
            width: 280,
            backgroundColor: '#0f172a',
            borderRight: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 20,
            overflowY: 'auto',
            userSelect: 'none',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Question Palette (Sequential)
            </div>

            {/* MCQ Section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 10 }}>
                MCQ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isCurrent =
                    currentQuestion.section === 'MCQ' && currentQuestion.index === num;
                  const isAnswered = answeredIds.has(`qa_${num.toString().padStart(4, '0')}`);
                  return (
                    <div
                      key={`mcq-${num}`}
                      title={
                        isCurrent ? 'Current active question' : 'Read-only sequential indicator'
                      }
                      style={{
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        backgroundColor: isCurrent ? '#2563eb' : isAnswered ? '#059669' : '#1e293b',
                        color: isCurrent || isAnswered ? '#ffffff' : '#94a3b8',
                        border: `1px solid ${isCurrent ? '#60a5fa' : isAnswered ? '#10b981' : '#334155'}`,
                        cursor: 'default', // Non-clickable in sequential mode (Decision 1)
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coding Section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 10 }}>
                Coding
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[11, 12, 13, 14, 15].map((num) => {
                  const isCurrent =
                    currentQuestion.section === 'Coding' && currentQuestion.index === num;
                  const isAnswered = answeredIds.has(`qa_${num.toString().padStart(4, '0')}`);
                  return (
                    <div
                      key={`coding-${num}`}
                      title={
                        isCurrent ? 'Current active question' : 'Read-only sequential indicator'
                      }
                      style={{
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        backgroundColor: isCurrent ? '#2563eb' : isAnswered ? '#059669' : '#1e293b',
                        color: isCurrent || isAnswered ? '#ffffff' : '#94a3b8',
                        border: `1px solid ${isCurrent ? '#60a5fa' : isAnswered ? '#10b981' : '#334155'}`,
                        cursor: 'default',
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SQL Section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 10 }}>
                SQL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[16, 17, 18, 19, 20].map((num) => {
                  const isCurrent =
                    currentQuestion.section === 'SQL' && currentQuestion.index === num;
                  const isAnswered = answeredIds.has(`qa_${num.toString().padStart(4, '0')}`);
                  return (
                    <div
                      key={`sql-${num}`}
                      title={
                        isCurrent ? 'Current active question' : 'Read-only sequential indicator'
                      }
                      style={{
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        backgroundColor: isCurrent ? '#2563eb' : isAnswered ? '#059669' : '#1e293b',
                        color: isCurrent || isAnswered ? '#ffffff' : '#94a3b8',
                        border: `1px solid ${isCurrent ? '#60a5fa' : isAnswered ? '#10b981' : '#334155'}`,
                        cursor: 'default',
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Palette Legend per UI Sample */}
          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#059669' }}
              />
              <span>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563eb' }}
              />
              <span>Current Question</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                }}
              />
              <span>Not Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#a855f7' }}
              />
              <span>Mark for Review (Local)</span>
            </div>
          </div>
        </aside>

        {/* Right: Active Question Presentation & Submission Area */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0b1120',
            overflowY: 'auto',
            padding: '24px 32px',
          }}
        >
          {errorMessage && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#450a0a',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Question Title & Mark for Review (Decision 4) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: '1px solid #1e293b',
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>
                {currentQuestion.title}
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Section: {currentQuestion.section} &bull; Time Limit:{' '}
                {currentQuestion.durationMinutes} mins
              </span>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: markedForReview[qAttemptId] ? '#c084fc' : '#94a3b8',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={!!markedForReview[qAttemptId]}
                onChange={handleToggleMarkReview}
                style={{ accentColor: '#a855f7', width: 16, height: 16 }}
              />
              <Bookmark size={15} />
              <span>Mark for Review</span>
            </label>
          </div>

          {/* Question Statement */}
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: '#e2e8f0',
              marginBottom: 20,
              backgroundColor: '#111827',
              padding: 18,
              borderRadius: 10,
              border: '1px solid #1f2937',
            }}
          >
            {currentQuestion.statement}
          </div>

          {/* Sample Input / Output boxes for Coding / SQL */}
          {currentQuestion.sampleInput && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 20,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#111827',
                  borderRadius: 8,
                  border: '1px solid #1f2937',
                }}
              >
                <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Input:</div>
                <code style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                  {currentQuestion.sampleInput}
                </code>
              </div>
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#111827',
                  borderRadius: 8,
                  border: '1px solid #1f2937',
                }}
              >
                <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Output:</div>
                <code style={{ color: '#34d399', fontFamily: 'monospace' }}>
                  {currentQuestion.sampleOutput}
                </code>
              </div>
            </div>
          )}

          {currentQuestion.explanation && (
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              <strong>Explanation:</strong> {currentQuestion.explanation}
            </div>
          )}

          {/* Response Input: MCQ vs Coding vs SQL */}
          <div style={{ flex: 1, marginBottom: 24 }}>
            {currentQuestion.type === 'single_choice' && currentQuestion.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentQuestion.options.map((opt) => {
                  const isChecked = currentAnswer === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 18px',
                        borderRadius: 8,
                        backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.15)' : '#111827',
                        border: `1px solid ${isChecked ? '#3b82f6' : '#1f2937'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQuestion.id}`}
                        checked={isChecked}
                        onChange={() => handleSelectOption(opt.id)}
                        style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: 14, color: isChecked ? '#ffffff' : '#cbd5e1' }}>
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {(currentQuestion.type === 'coding' || currentQuestion.type === 'sql') && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#0f172a',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    backgroundColor: '#1e293b',
                    borderBottom: '1px solid #334155',
                    fontSize: 12,
                    color: '#94a3b8',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    Language: {currentQuestion.language || 'Python 3.11'}
                  </span>
                  <span>Editor &bull; Monaco Mock</span>
                </div>
                <textarea
                  value={(currentAnswer as string) ?? currentQuestion.codeSnippet ?? ''}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  rows={10}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: 13,
                    padding: 14,
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            )}

            {codeOutput && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 6,
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#34d399',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {codeOutput}
              </div>
            )}
          </div>

          {/* Bottom Action Controls per UI Sample & Decision 1 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 16,
              borderTop: '1px solid #1e293b',
            }}
          >
            <div>
              {/* Note: Previous button is hidden per Decision 1 & FR-UI-005 in sequential mode */}
              {(currentQuestion.type === 'coding' || currentQuestion.type === 'sql') && (
                <button
                  type="button"
                  onClick={handleRunCode}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 6,
                    backgroundColor: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Play size={14} color="#34d399" />
                  <span>Run Code</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: 6,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Answer'}</span>
                {!isSubmitting && <Check size={16} />}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* End Test / Final Submit Confirmation Modal (Decision 4, FR-UI-007, BR-004) */}
      {showEndTestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 440,
              backgroundColor: '#111827',
              borderRadius: 12,
              border: '1px solid #1f2937',
              padding: 28,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px 0', color: '#f8fafc' }}>
              Confirm Final Assessment Submission
            </h3>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to end your assessment? Once submitted, unanswered questions
              will be auto-finalized and no further modifications can be made.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowEndTestModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: '#1f2937',
                  color: '#cbd5e1',
                  border: '1px solid #374151',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                }}
              >
                {isSubmitting ? 'Finalizing...' : 'Yes, End Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
