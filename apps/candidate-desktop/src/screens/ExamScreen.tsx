import React, { useState, useRef } from 'react';
import { Play, AlertCircle, Bookmark, Code2, Database } from 'lucide-react';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { apiClient } from '../services/apiClient';
import { MockAssessmentSession, MockQuestion } from '../services/mockApi';
import { QuestionStatusPanel, QuestionStatusItem } from '../components/exam/QuestionStatusPanel';
import { SingleChoiceRenderer } from '../components/exam/renderers/SingleChoiceRenderer';
import { MultipleSelectRenderer } from '../components/exam/renderers/MultipleSelectRenderer';
import { TrueFalseRenderer } from '../components/exam/renderers/TrueFalseRenderer';
import { ShortAnswerRenderer } from '../components/exam/renderers/ShortAnswerRenderer';
import { TimerComponent } from '../components/exam/TimerComponent';
import { SubmitNextButton, SubmissionButtonState } from '../components/exam/SubmitNextButton';
import { handleApiError } from '../services/errorHandler';

/**
 * Exam Interface Screen
 * Source of truth: docs/design/UI_Sample.jpeg (Screen 4), docs/DECISIONS.md
 * Non-Negotiable Rules & SRS Requirements:
 * - Rule 1: Server authority for timing & deadlines (FR-TIME-001)
 * - Rule 3 & FR-ANS-009: Every submission carries client-generated Idempotency-Key
 * - Decision 1: Read-only question status palette in sequential mode (FR-UI-005)
 * - Decision 1: Previous button is hidden in sequential mode
 * - Decision 4: Mark for Review is local visual aid only
 * - FR-UI-006: Multiple-submission / double-click protection (in-flight state)
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
  const [submissionState, setSubmissionState] = useState<SubmissionButtonState>('idle');
  const [showEndTestModal, setShowEndTestModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);

  // Store current idempotency key per attempt to preserve on retry (Rule 3, FR-ANS-009)
  const currentKeyRef = useRef<Record<string, string>>({});

  const currentQuestion: MockQuestion = session.questions[currentIdx] || session.questions[0];
  const qAttemptId = currentQuestion.attemptId;
  const isLastQuestion = currentIdx + 1 >= session.questions.length;

  // Local answer state for current question
  const currentAnswer = selectedAnswers[qAttemptId];

  // Map session questions to QuestionStatusItem
  const statusItems: QuestionStatusItem[] = session.questions.map((q, idx) => ({
    id: q.id,
    index: idx,
    displayNumber: idx + 1,
    section: q.section,
    isAnswered: answeredIds.has(q.attemptId),
    isCurrent: idx === currentIdx,
    isMarkedForReview: !!markedForReview[q.attemptId],
  }));

  const handleToggleMarkReview = () => {
    setMarkedForReview((prev) => ({ ...prev, [qAttemptId]: !prev[qAttemptId] }));
  };

  const handleRunCode = () => {
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
    if (submissionState === 'in-flight') return; // Multiple-click prevention (FR-UI-006)
    setSubmissionState('in-flight');
    setErrorMessage(null);

    // Retrieve or generate persistent Idempotency-Key for this question attempt
    if (!currentKeyRef.current[qAttemptId]) {
      currentKeyRef.current[qAttemptId] = crypto.randomUUID();
    }
    const idempotencyKey = currentKeyRef.current[qAttemptId];

    const answerPayload = {
      questionAttemptId: qAttemptId,
      response:
        currentAnswer ??
        (currentQuestion.type === 'coding'
          ? currentQuestion.codeSnippet
          : currentQuestion.type === 'sql'
            ? currentQuestion.codeSnippet
            : ''),
    };

    try {
      // Rule 3 & FR-ANS-009: Client-generated idempotency key UUID
      await apiClient.submitAnswer(answerPayload, idempotencyKey);

      setAnsweredIds((prev) => new Set(prev).add(qAttemptId));
      setSubmissionState('success');

      setTimeout(() => {
        if (!isLastQuestion) {
          setCurrentIdx((prev) => prev + 1);
          setCodeOutput(null);
          setSubmissionState('idle');
        } else {
          setSubmissionState('idle');
          setShowEndTestModal(true);
        }
      }, 400);
    } catch (err: unknown) {
      const formatted = handleApiError(err);
      setErrorMessage(formatted.message);
      setSubmissionState('retry');
    }
  };

  const handleConfirmFinalSubmit = async () => {
    setSubmissionState('in-flight');
    try {
      await apiClient.finalSubmit(session.sessionId);
      onFinishExam();
    } catch (err: unknown) {
      const formatted = handleApiError(err);
      setErrorMessage(formatted.message);
      setSubmissionState('retry');
    } finally {
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
        {/* Left: Question Status Panel (Read-only in sequential mode per Decision 1) */}
        <QuestionStatusPanel
          questions={statusItems}
          currentIndex={currentIdx}
          isSequentialMode={true}
        />

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
          {/* Header Info: Section, Timer, Mark for Review */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #1f2937',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: '#93c5fd',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {currentQuestion.section} &bull; Question {currentIdx + 1} of{' '}
                {session.questions.length}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0 0', color: '#f8fafc' }}>
                {currentQuestion.title}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Question Countdown Timer with Drift Correction (FR-TIME-001, FR-TIME-008) */}
              <TimerComponent serverDeadline={session.overallDeadlineAt} label="Exam Timer" />

              {/* Local Mark for Review Checkbox (Decision 4) */}
              <button
                type="button"
                onClick={handleToggleMarkReview}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  backgroundColor: markedForReview[qAttemptId]
                    ? 'rgba(245, 158, 11, 0.15)'
                    : '#1e293b',
                  border: `1px solid ${markedForReview[qAttemptId] ? '#f59e0b' : '#334155'}`,
                  color: markedForReview[qAttemptId] ? '#fbbf24' : '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Bookmark size={14} />
                <span>{markedForReview[qAttemptId] ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>
            </div>
          </div>

          {/* Question Statement */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#f1f5f9', margin: '0 0 16px 0' }}>
              {currentQuestion.statement}
            </p>

            {/* Explanation or Sample Input/Output if present */}
            {(currentQuestion.sampleInput || currentQuestion.sampleOutput) && (
              <div
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: '#94a3b8',
                  marginBottom: 16,
                }}
              >
                {currentQuestion.sampleInput && <div>Input: {currentQuestion.sampleInput}</div>}
                {currentQuestion.sampleOutput && <div>Output: {currentQuestion.sampleOutput}</div>}
                {currentQuestion.explanation && (
                  <div style={{ marginTop: 4, color: '#64748b' }}>
                    Explanation: {currentQuestion.explanation}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Renderers per Question Type (FR-QB-003) */}
          <div style={{ marginBottom: 32 }}>
            {currentQuestion.type === 'single_choice' && currentQuestion.options && (
              <SingleChoiceRenderer
                questionId={qAttemptId}
                options={currentQuestion.options}
                value={(currentAnswer as string) || null}
                onChange={(optId) =>
                  setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: optId }))
                }
              />
            )}

            {currentQuestion.type === 'multiple_select' && currentQuestion.options && (
              <MultipleSelectRenderer
                questionId={qAttemptId}
                options={currentQuestion.options}
                value={Array.isArray(currentAnswer) ? (currentAnswer as string[]) : []}
                onChange={(optIds) =>
                  setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: optIds }))
                }
              />
            )}

            {currentQuestion.type === 'true_false' && (
              <TrueFalseRenderer
                questionId={qAttemptId}
                value={(currentAnswer as string) || null}
                onChange={(val) => setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: val }))}
              />
            )}

            {currentQuestion.type === 'short_answer' && (
              <ShortAnswerRenderer
                questionId={qAttemptId}
                value={(currentAnswer as string) || ''}
                onChange={(text) => setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: text }))}
                placeholder="Type your short answer response here..."
              />
            )}

            {/* Coding & SQL Editor Mock (Retained for Technical Questions) */}
            {(currentQuestion.type === 'coding' || currentQuestion.type === 'sql') && (
              <div>
                <div
                  style={{
                    backgroundColor: '#111827',
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid #1f2937',
                    borderBottom: 'none',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: '#93c5fd',
                    }}
                  >
                    {currentQuestion.type === 'coding' ? (
                      <Code2 size={16} />
                    ) : (
                      <Database size={16} />
                    )}
                    <span>
                      {currentQuestion.type === 'coding' ? 'Python 3.10' : 'SQLite Ephemeral'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunCode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#60a5fa',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={12} fill="#60a5fa" />
                    <span>Run Sample Cases</span>
                  </button>
                </div>

                <textarea
                  value={
                    typeof currentAnswer === 'string'
                      ? (currentAnswer as string)
                      : currentQuestion.codeSnippet || ''
                  }
                  onChange={(e) =>
                    setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: e.target.value }))
                  }
                  rows={8}
                  style={{
                    width: '100%',
                    backgroundColor: '#030712',
                    border: '1px solid #1f2937',
                    borderRadius: '0 0 8px 8px',
                    color: '#e2e8f0',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 14,
                    padding: 16,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {codeOutput && (
                  <pre
                    style={{
                      marginTop: 12,
                      backgroundColor: '#030712',
                      border: '1px solid #1f2937',
                      borderRadius: 6,
                      padding: 12,
                      fontSize: 12,
                      fontFamily: 'Consolas, Monaco, monospace',
                      color: '#34d399',
                      overflowX: 'auto',
                    }}
                  >
                    {codeOutput}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Bar: Previous hidden (Decision 1), SubmitNextButton with in-flight/retry states */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 20,
              borderTop: '1px solid #1f2937',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Sequential mode: Questions cannot be revisited after submitting (FR-TIME-009).
            </div>

            <SubmitNextButton
              state={submissionState}
              isLastQuestion={isLastQuestion}
              errorMessage={errorMessage}
              onSubmit={handleSubmitAnswer}
              onRetry={handleSubmitAnswer}
            />
          </div>
        </main>
      </div>

      {/* End Test / Final Submit Confirmation Modal (Decision 4, FR-UI-007) */}
      {showEndTestModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={22} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                End Assessment Confirmation
              </h3>
            </div>

            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to end and submit your assessment? Any unanswered questions will
              be auto-finalized. Once confirmed, your responses cannot be modified.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowEndTestModal(false)}
                disabled={submissionState === 'in-flight'}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: '#cbd5e1',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                disabled={submissionState === 'in-flight'}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                {submissionState === 'in-flight' ? 'Submitting...' : 'Confirm & End Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
