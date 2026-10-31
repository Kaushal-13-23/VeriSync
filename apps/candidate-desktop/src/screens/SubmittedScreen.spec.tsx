import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmittedScreen } from './SubmittedScreen';
import { MockAssessmentSession, MockUser } from '../services/mockApi';
import { CandidateFinalSubmitResponse } from '../types/assessment';
import { UserRole } from '@verisync/shared';

describe('SubmittedScreen Results Visibility (FR-ASMT-002, FR-SCORE-008, FR-UI-009)', () => {
  const dummyUser: MockUser = {
    id: 'u-001',
    username: 'candidate1',
    role: UserRole.CANDIDATE,
    candidateId: 'CAN-2026-081',
  };

  const dummySession: MockAssessmentSession = {
    sessionId: 'sess-123',
    assessmentId: 'asmt-frontend-2026',
    title: 'Frontend Engineering Assessment',
    candidateId: 'CAN-2026-081',
    totalQuestions: 6,
    totalDurationMinutes: 90,
    startedAt: '2026-10-29T10:00:00.000Z',
    overallDeadlineAt: '2026-10-29T11:30:00.000Z',
    currentQuestionIndex: 0,
    questions: [],
    answeredAttemptIds: new Set(['qa_1', 'qa_2', 'qa_3', 'qa_4', 'qa_5']),
    markedForReviewIds: new Set(),
    isFinalSubmitted: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders confirmation only and suppresses results when resultVisibility is ADMIN_RELEASE (FR-ASMT-002)', () => {
    const finalResult: CandidateFinalSubmitResponse = {
      status: 'submitted',
      sessionId: 'sess-123',
      candidateIdentifier: 'CAN-2026-081',
      assessmentTitle: 'Frontend Engineering Assessment',
      totalQuestions: 6,
      answeredCount: 5,
      submittedAt: '2026-10-29T11:00:00.000Z',
      serverTime: '2026-10-29T11:00:00.000Z',
      resultVisibility: 'ADMIN_RELEASE',
      result: null,
    };

    render(<SubmittedScreen user={dummyUser} session={dummySession} finalResult={finalResult} />);

    // Submission confirmation details are present
    expect(screen.getByText('Test Submitted Successfully!')).toBeInTheDocument();
    expect(screen.getByTestId('submission-summary-card')).toBeInTheDocument();
    expect(screen.getByText('CAN-2026-081')).toBeInTheDocument();
    expect(screen.getByText('5 of 6')).toBeInTheDocument();

    // Policy notice is displayed
    expect(screen.getByTestId('result-restricted-policy')).toBeInTheDocument();
    expect(screen.getByText(/Result Visibility Policy \(FR-ASMT-002\)/i)).toBeInTheDocument();

    // Results card is NOT displayed
    expect(screen.queryByTestId('candidate-results-card')).not.toBeInTheDocument();
  });

  it('renders score breakdown and PASSED badge when resultVisibility is IMMEDIATE and score >= benchmark (FR-SCORE-008)', () => {
    const finalResult: CandidateFinalSubmitResponse = {
      status: 'submitted',
      sessionId: 'sess-123',
      candidateIdentifier: 'CAN-2026-081',
      assessmentTitle: 'Frontend Engineering Assessment',
      totalQuestions: 6,
      answeredCount: 6,
      submittedAt: '2026-10-29T11:00:00.000Z',
      serverTime: '2026-10-29T11:00:00.000Z',
      resultVisibility: 'IMMEDIATE',
      result: {
        totalScore: 25,
        maximumScore: 30,
        percentage: 83,
        passed: true,
        benchmarkScore: 60,
        resultStatus: 'FINAL',
        evaluatedAt: '2026-10-29T11:00:01.000Z',
      },
    };

    render(<SubmittedScreen user={dummyUser} session={dummySession} finalResult={finalResult} />);

    // Results card is rendered
    expect(screen.getByTestId('candidate-results-card')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('/ 30 pts')).toBeInTheDocument();
    expect(screen.getByText('(83%)')).toBeInTheDocument();

    // Outcome badge
    const badge = screen.getByTestId('outcome-badge');
    expect(badge).toHaveTextContent('PASSED');

    // Restricted policy notice is NOT rendered
    expect(screen.queryByTestId('result-restricted-policy')).not.toBeInTheDocument();
  });

  it('renders PROVISIONAL badge and notice when subjective questions are pending manual evaluation (FR-SCORE-008)', () => {
    const finalResult: CandidateFinalSubmitResponse = {
      status: 'submitted',
      sessionId: 'sess-123',
      candidateIdentifier: 'CAN-2026-081',
      assessmentTitle: 'Frontend Engineering Assessment',
      totalQuestions: 6,
      answeredCount: 6,
      submittedAt: '2026-10-29T11:00:00.000Z',
      serverTime: '2026-10-29T11:00:00.000Z',
      resultVisibility: 'IMMEDIATE',
      result: {
        totalScore: 18,
        maximumScore: 30,
        percentage: 60,
        passed: true,
        benchmarkScore: 60,
        resultStatus: 'PROVISIONAL',
        evaluatedAt: '2026-10-29T11:00:01.000Z',
      },
    };

    render(<SubmittedScreen user={dummyUser} session={dummySession} finalResult={finalResult} />);

    expect(screen.getByTestId('provisional-badge')).toHaveTextContent('Provisional');
    expect(screen.getByText(/Provisional Notice \(FR-SCORE-008\)/i)).toBeInTheDocument();
  });

  it('invokes window.verisyncBridge.closeApp() when Close Application button is clicked', async () => {
    const mockCloseApp = vi.fn().mockResolvedValue(undefined);
    window.verisyncBridge = {
      closeApp: mockCloseApp,
    } as unknown as typeof window.verisyncBridge;

    render(<SubmittedScreen user={dummyUser} session={dummySession} finalResult={null} />);

    const closeBtn = screen.getByRole('button', { name: /Close Application/i });
    fireEvent.click(closeBtn);

    expect(mockCloseApp).toHaveBeenCalledTimes(1);
  });
});
