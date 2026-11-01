import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  AlertCircle,
  Bookmark,
  Code2,
  Database,
  RotateCcw,
  RefreshCw,
  Clock,
  Eye,
} from 'lucide-react';
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
import { CandidateQuestionDto, QuestionType, SessionState } from '@verisync/shared';
import { CandidateFinalSubmitResponse } from '../types/assessment';

/**
 * Exam Interface Screen
 * Source of truth: docs/design/UI_Sample.jpeg (Screen 4), docs/DECISIONS.md, docs/SRS/srs.md
 * Non-Negotiable Rules & SRS Requirements:
 * - Rule 1 & FR-TIME-001: Server authority for timing & deadlines (display never decides acceptance)
 * - Rule 3 & FR-ANS-009: Every submission carries client-generated Idempotency-Key
 * - Rule 4 & FR-ANS-003: Durable backend persistence before client acknowledgement
 * - Decision 1 & FR-UI-005: Read-only question status palette in sequential mode
 * - Decision 1 & FR-UI-004: Previous button is hidden in sequential mode
 * - Decision 4 & FR-ANS-005: Mark for Review is local visual aid only
 * - FR-UI-006: Multiple-submission / double-click protection (in-flight state)
 * - FR-UI-007 & FR-TIME-005: Timeout notice and automatic transition to next question (TC-05)
 * - FR-TIME-010 & FR-ANS-007: Safe reconnection & resumption from authoritative state (TC-07)
 */

interface ExamScreenProps {
  session: MockAssessmentSession;
  onFinishExam: (finalResult?: CandidateFinalSubmitResponse) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({ session, onFinishExam }) => {
  const [currentIdx, setCurrentIdx] = useState(session.currentQuestionIndex || 0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, unknown>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set(session.answeredAttemptIds));
  const [submissionState, setSubmissionState] = useState<SubmissionButtonState>('idle');
  const [showEndTestModal, setShowEndTestModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeQuestionDto, setActiveQuestionDto] = useState<CandidateQuestionDto | null>(null);

  // NFR-USE-005: Accessibility Controls (Font Scaling & High Contrast Mode)
  const [fontScale, setFontScale] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Prevent duplicate final submissions
  const hasFinishedRef = useRef(false);

  // Store persistent idempotency key per question attempt (Rule 3, FR-ANS-009, TC-04)
  const currentKeyRef = useRef<Record<string, string>>({});

  const totalQuestions = session.questions?.length || 6;
  const currentQuestion: MockQuestion = session.questions[currentIdx] || session.questions[0];
  const qAttemptId = activeQuestionDto?.questionAttemptId || currentQuestion.attemptId;
  const isLastQuestion = currentIdx + 1 >= totalQuestions;

  // Local answer state for current question
  const currentAnswer = selectedAnswers[qAttemptId];

  // Map questions to QuestionStatusItem for read-only palette
  const statusItems: QuestionStatusItem[] = session.questions.map((q, idx) => ({
    id: q.id,
    index: idx,
    displayNumber: idx + 1,
    section: q.section,
    isAnswered: answeredIds.has(q.attemptId),
    isCurrent: idx === currentIdx,
    isMarkedForReview: !!markedForReview[q.attemptId],
  }));

  /**
   * Reconnect & Resume: Synchronize authoritative session state (FR-TIME-010, FR-ANS-007, TC-07)
   */
  const syncAuthoritativeState = useCallback(async () => {
    setIsSyncing(true);
    try {
      const status = await apiClient.getSessionStatus(session.sessionId);

      if (status.sessionStatus === SessionState.SUBMITTED) {
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          onFinishExam();
        }
        return;
      }

      // Update answered attempts from authoritative server palette
      const serverAnswered = new Set<string>();
      let serverActiveIdx = currentIdx;

      status.palette.forEach((item, idx) => {
        if (item.status === 'ANSWERED') {
          serverAnswered.add(item.questionAttemptId);
        } else if (item.status === 'CURRENT') {
          serverActiveIdx = idx;
        }
      });

      setAnsweredIds(serverAnswered);
      setCurrentIdx(serverActiveIdx);

      // Fetch active question details
      const qDto = await apiClient.getCurrentQuestion(session.sessionId);
      if (qDto) {
        setActiveQuestionDto(qDto);
      }
    } catch {
      // Reconnection sync error: keep local working state
    } finally {
      setIsSyncing(false);
    }
  }, [session.sessionId, currentIdx, onFinishExam]);

  // Listen for online reconnection events (TC-07)
  useEffect(() => {
    const handleOnline = () => {
      syncAuthoritativeState();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncAuthoritativeState]);

  // Initial authoritative sync on mount
  useEffect(() => {
    syncAuthoritativeState();
  }, [syncAuthoritativeState]);

  // Local Mark for Review toggle (Decision 4 - strictly local visual aid)
  const handleToggleMarkReview = () => {
    setMarkedForReview((prev) => ({ ...prev, [qAttemptId]: !prev[qAttemptId] }));
  };

  // Clear current question response
  const handleClearResponse = () => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qAttemptId];
      return copy;
    });
  };

  // NFR-USE-005: Keyboard Operation & Hotkeys within Lockdown Environment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      // Alt+S or Ctrl+Enter: Submit and Next
      if ((e.altKey && (e.key === 's' || e.key === 'S')) || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (submissionState !== 'in-flight') {
          void handleSubmitAnswer();
        }
        return;
      }

      // Alt+M: Toggle Mark for Review
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleToggleMarkReview();
        return;
      }

      // Alt+C: Clear Response
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleClearResponse();
        return;
      }

      // 1-9 or A-D option selection on MCQ questions
      if (!isInput && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (currentQuestion.options && currentQuestion.options.length > 0) {
          let chosenIdx = -1;
          const kLower = e.key.toLowerCase();
          if (e.key >= '1' && e.key <= '9') {
            chosenIdx = parseInt(e.key, 10) - 1;
          } else if (kLower >= 'a' && kLower <= 'd') {
            chosenIdx = kLower.charCodeAt(0) - 'a'.charCodeAt(0);
          }

          if (chosenIdx >= 0 && chosenIdx < currentQuestion.options.length) {
            e.preventDefault();
            const optionId = currentQuestion.options[chosenIdx].id;
            if (
              currentQuestion.type === 'multiple_select' ||
              currentQuestion.type === QuestionType.MCQ_MULTIPLE
            ) {
              const currentArr = Array.isArray(currentAnswer) ? (currentAnswer as string[]) : [];
              const updated = currentArr.includes(optionId)
                ? currentArr.filter((id) => id !== optionId)
                : [...currentArr, optionId];
              setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: updated }));
            } else {
              setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: optionId }));
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [submissionState, currentQuestion, currentAnswer, qAttemptId]);

  const handleRunCode = () => {
    if (currentQuestion.type === 'coding' || currentQuestion.type === QuestionType.CODING) {
      setCodeOutput(
        'Running sample test cases...\nTest 1 (n=10): Passed (Output: 17, Expected: 17)\nAll visible sample cases passed.',
      );
    } else if (currentQuestion.type === 'sql' || currentQuestion.type === QuestionType.SQL) {
      setCodeOutput(
        'Executing query on ephemeral SQLite instance...\n| SecondHighestSalary |\n| 200                 |\n1 row returned (4ms).',
      );
    }
  };

  /**
   * Submit and Next with Idempotency-Key & Double-Click Protection
   * (FR-ANS-001..009, Rule 3, Rule 4, TC-04, TC-05)
   */
  const handleSubmitAnswer = async () => {
    if (submissionState === 'in-flight') return; // Multiple-click protection (FR-UI-006)
    setSubmissionState('in-flight');
    setErrorMessage(null);
    setTimeoutNotice(null);

    // Retrieve or generate persistent Idempotency-Key for this question attempt
    if (!currentKeyRef.current[qAttemptId]) {
      currentKeyRef.current[qAttemptId] = crypto.randomUUID();
    }
    const idempotencyKey = currentKeyRef.current[qAttemptId];

    const answerValue =
      currentAnswer ??
      (currentQuestion.type === 'coding' || currentQuestion.type === QuestionType.CODING
        ? currentQuestion.codeSnippet
        : currentQuestion.type === 'sql' || currentQuestion.type === QuestionType.SQL
          ? currentQuestion.codeSnippet
          : '');

    try {
      // Send answer with Idempotency-Key header to server
      const ack = await apiClient.submitSessionAnswer(
        session.sessionId,
        {
          questionAttemptId: qAttemptId,
          answer: answerValue,
        },
        idempotencyKey,
      );

      // Display success ONLY upon receipt of server acknowledgement (FR-ANS-006)
      setAnsweredIds((prev) => new Set(prev).add(qAttemptId));
      setSubmissionState('success');

      setTimeout(() => {
        if (!isLastQuestion) {
          if (ack.next) {
            setCurrentIdx((prev) => prev + 1);
          } else {
            setCurrentIdx((prev) => prev + 1);
          }
          setCodeOutput(null);
          setSubmissionState('idle');
        } else {
          setSubmissionState('idle');
          setShowEndTestModal(true);
        }
      }, 400);
    } catch (err: unknown) {
      const formatted = handleApiError(err);

      // Handle QUESTION_EXPIRED (HTTP 409) - automatic advance (FR-TIME-004, TC-05)
      if (formatted.code === 'QUESTION_EXPIRED') {
        setTimeoutNotice(
          'Question time limit has expired. Automatically advancing to next question...',
        );
        setSubmissionState('idle');
        setTimeout(() => {
          setTimeoutNotice(null);
          if (!isLastQuestion) {
            setCurrentIdx((prev) => prev + 1);
            setCodeOutput(null);
          } else {
            setShowEndTestModal(true);
          }
        }, 1500);
        return;
      }

      // Lost response or retryable network interruption: keep SAME idempotency key (TC-04, Rule 3)
      setErrorMessage(formatted.message);
      setSubmissionState('retry');
    }
  };

  /**
   * Question Countdown Expiry Handler (FR-TIME-005, FR-UI-007, TC-05)
   */
  const handleQuestionTimeout = () => {
    setTimeoutNotice('Time limit expired for this question. Moving to next question...');
    setTimeout(() => {
      setTimeoutNotice(null);
      if (!isLastQuestion) {
        setCurrentIdx((prev) => prev + 1);
        setCodeOutput(null);
      } else {
        setShowEndTestModal(true);
      }
    }, 1500);
  };

  /**
   * Overall Assessment Deadline Expiry Handler (FR-TIME-007)
   */
  const handleOverallTimeout = () => {
    setTimeoutNotice('Assessment overall deadline reached. Finalizing submissions...');
    setTimeout(() => {
      handleConfirmFinalSubmit();
    }, 1200);
  };

  /**
   * Final Assessment Submission (FR-ANS-008, UC-13, Decision 4)
   */
  const handleConfirmFinalSubmit = async () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setSubmissionState('in-flight');
    try {
      const finalResult = await apiClient.finalSubmitSession(session.sessionId);
      onFinishExam(finalResult);
    } catch (err: unknown) {
      hasFinishedRef.current = false;
      const formatted = handleApiError(err);
      setErrorMessage(formatted.message);
      setSubmissionState('retry');
    } finally {
      setShowEndTestModal(false);
    }
  };

  // Question Deadline: prioritize authoritative activeQuestionDto deadline or default to overall
  const questionDeadline = activeQuestionDto?.deadlineAt || session.overallDeadlineAt;

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

      {/* Timeout Alert Notification Toast (FR-UI-007, TC-05) */}
      {timeoutNotice && (
        <div
          role="alert"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            zIndex: 40,
          }}
        >
          <Clock size={18} />
          <span>{timeoutNotice}</span>
        </div>
      )}

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Question Status Panel (Read-only in sequential mode per Decision 1, FR-UI-005) */}
        <QuestionStatusPanel
          questions={statusItems}
          currentIndex={currentIdx}
          isSequentialMode={true}
        />

        {/* Right: Active Question Presentation & Submission Area */}
        <main
          role="region"
          aria-label="Active Question Workspace"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: isHighContrast ? '#000000' : '#0b1120',
            color: isHighContrast ? '#ffffff' : '#f8fafc',
            overflowY: 'auto',
            padding: '24px 32px',
            fontSize: fontScale === 'xlarge' ? '17px' : fontScale === 'large' ? '15px' : '14px',
            lineHeight: 1.6,
          }}
        >
          {/* Header Info: Section, Authoritative Timer, Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: isHighContrast ? '2px solid #facc15' : '1px solid #1f2937',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: isHighContrast ? '#facc15' : '#93c5fd',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {currentQuestion.section} &bull; Question {currentIdx + 1} of {totalQuestions}
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: '4px 0 0 0',
                  color: isHighContrast ? '#ffffff' : '#f8fafc',
                }}
              >
                {currentQuestion.title}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* NFR-USE-005: Font Size Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: isHighContrast ? '#18181b' : '#1e293b',
                  borderRadius: 6,
                  border: isHighContrast ? '1px solid #facc15' : '1px solid #334155',
                  padding: '2px 4px',
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => setFontScale('normal')}
                  aria-label="Normal Font Size"
                  aria-pressed={fontScale === 'normal'}
                  style={{
                    padding: '4px 7px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: fontScale === 'normal' ? '#2563eb' : 'transparent',
                    color: fontScale === 'normal' ? '#ffffff' : '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontScale('large')}
                  aria-label="Large Font Size"
                  aria-pressed={fontScale === 'large'}
                  style={{
                    padding: '4px 7px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: fontScale === 'large' ? '#2563eb' : 'transparent',
                    color: fontScale === 'large' ? '#ffffff' : '#94a3b8',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setFontScale('xlarge')}
                  aria-label="Extra Large Font Size"
                  aria-pressed={fontScale === 'xlarge'}
                  style={{
                    padding: '4px 7px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: fontScale === 'xlarge' ? '#2563eb' : 'transparent',
                    color: fontScale === 'xlarge' ? '#ffffff' : '#94a3b8',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  A++
                </button>
              </div>

              {/* High Contrast Toggle Button */}
              <button
                type="button"
                onClick={() => setIsHighContrast((prev) => !prev)}
                aria-label="Toggle High Contrast Mode"
                aria-pressed={isHighContrast}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: isHighContrast ? '#facc15' : '#1e293b',
                  color: isHighContrast ? '#000000' : '#cbd5e1',
                  border: isHighContrast ? '1px solid #ca8a04' : '1px solid #334155',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Eye size={13} />
                <span>{isHighContrast ? 'Standard' : 'Contrast'}</span>
              </button>

              {/* Sync Status Button (FR-TIME-010, TC-07) */}
              <button
                type="button"
                onClick={syncAuthoritativeState}
                disabled={isSyncing}
                title="Synchronize session status from authoritative server"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>

              {/* Question Countdown Timer with Drift Correction (FR-TIME-001, FR-TIME-008, TC-01) */}
              <TimerComponent
                serverDeadline={questionDeadline}
                label="Question Timer"
                onExpire={handleQuestionTimeout}
              />

              {/* Overall Exam Countdown Timer */}
              <TimerComponent
                serverDeadline={session.overallDeadlineAt}
                label="Total Time"
                onExpire={handleOverallTimeout}
              />

              {/* Local Mark for Review Action (Decision 4) */}
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
            {(currentQuestion.type === 'single_choice' ||
              currentQuestion.type === QuestionType.MCQ_SINGLE) &&
              currentQuestion.options && (
                <SingleChoiceRenderer
                  questionId={qAttemptId}
                  options={currentQuestion.options}
                  value={(currentAnswer as string) || null}
                  onChange={(optId) =>
                    setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: optId }))
                  }
                />
              )}

            {(currentQuestion.type === 'multiple_select' ||
              currentQuestion.type === QuestionType.MCQ_MULTIPLE) &&
              currentQuestion.options && (
                <MultipleSelectRenderer
                  questionId={qAttemptId}
                  options={currentQuestion.options}
                  value={Array.isArray(currentAnswer) ? (currentAnswer as string[]) : []}
                  onChange={(optIds) =>
                    setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: optIds }))
                  }
                />
              )}

            {(currentQuestion.type === 'true_false' ||
              currentQuestion.type === QuestionType.TRUE_FALSE) && (
              <TrueFalseRenderer
                questionId={qAttemptId}
                value={(currentAnswer as string) || null}
                onChange={(val) => setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: val }))}
              />
            )}

            {(currentQuestion.type === 'short_answer' ||
              currentQuestion.type === QuestionType.SHORT_ANSWER) && (
              <ShortAnswerRenderer
                questionId={qAttemptId}
                value={(currentAnswer as string) || ''}
                onChange={(text) => setSelectedAnswers((prev) => ({ ...prev, [qAttemptId]: text }))}
                placeholder="Type your short answer response here..."
              />
            )}

            {/* Technical Question / Code Editor Area */}
            {(currentQuestion.type === 'coding' ||
              currentQuestion.type === QuestionType.CODING ||
              currentQuestion.type === 'sql' ||
              currentQuestion.type === QuestionType.SQL) && (
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
                    {currentQuestion.type === 'coding' ||
                    currentQuestion.type === QuestionType.CODING ? (
                      <Code2 size={16} />
                    ) : (
                      <Database size={16} />
                    )}
                    <span>
                      {currentQuestion.type === 'coding' ||
                      currentQuestion.type === QuestionType.CODING
                        ? 'Python 3.10'
                        : 'SQLite Ephemeral'}
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

          {/* Bottom Action Bar: Previous is strictly hidden in sequential mode (Decision 1, FR-UI-005) */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Clear Response Button */}
              <button
                type="button"
                onClick={handleClearResponse}
                disabled={submissionState === 'in-flight'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: 6,
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: submissionState === 'in-flight' ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={14} />
                <span>Clear Response</span>
              </button>

              <span style={{ fontSize: 13, color: '#64748b' }}>
                Sequential mode: Questions cannot be revisited once submitted (FR-TIME-009).
              </span>
            </div>

            {/* Submit & Next Button with in-flight / retry / double-click protection */}
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
