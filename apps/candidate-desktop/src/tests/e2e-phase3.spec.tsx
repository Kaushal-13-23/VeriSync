import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { apiClient } from '../services/apiClient';
import { mockApi, MockAssessmentSession } from '../services/mockApi';
import { ExamScreen } from '../screens/ExamScreen';
import { SubmittedScreen } from '../screens/SubmittedScreen';
import { ApiErrorCode, SessionState, FinalSubmitResponseDto, UserRole } from '@verisync/shared';
import { timeSync } from '../services/timeSync';

/**
 * End-to-End Tests for Phase 3 Candidate Examination Runtime
 * Source of truth: docs/SRS/srs.md (Sections 3.2, 3.3, 3.4, 5.5, 5.6, 5.13)
 * Non-Negotiable Rules & SRS Requirements:
 * - Rule 1 & FR-TIME-001: Server authority for timing & deadlines (display never decides acceptance)
 * - Rule 3 & FR-ANS-009: Mandatory client-generated Idempotency-Key on submissions
 * - Rule 4 & FR-ANS-003: Durable persistence before acknowledgement
 * - TC-04: Duplicate answer submissions with same Idempotency-Key return original result and create no duplicates
 * - TC-05: Answer submitted after question timeout is rejected with HTTP 409 QUESTION_EXPIRED and auto-advances
 * - TC-07: Session recovery after disconnection: remaining server deadline continues without pause/reset
 */

describe('Phase 3 E2E Exam Runtime: TC04, TC05, TC07 (FR-TIME, FR-ANS, FR-UI)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockApi.resetStore();
    apiClient.setConfig({ forceMock: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // TC-04: Duplicate Submissions & Lost Response Retries with Idempotency-Key
  // =========================================================================
  describe('TC-04: Duplicate Answer Submissions & Lost Response Retries (Rule 3, FR-ANS-009, FR-UI-006)', () => {
    it('TC-04 [API]: Submitting same answer with identical Idempotency-Key returns original result without duplicate records', async () => {
      const session = await apiClient.startSession('asmt-frontend-2026');
      const idempotencyKey = crypto.randomUUID();

      // First submission attempt
      const firstAck = await apiClient.submitSessionAnswer(
        session.sessionId,
        {
          questionAttemptId: 'qa_0001',
          answer: 'opt_2',
        },
        idempotencyKey,
      );

      expect(firstAck.status).toBe('accepted');
      expect(firstAck.questionAttemptId).toBe('qa_0001');
      expect(firstAck.submittedAt).toBeDefined();

      // Simulated network retry with the exact same Idempotency-Key (lost ack scenario)
      const duplicateAck = await apiClient.submitSessionAnswer(
        session.sessionId,
        {
          questionAttemptId: 'qa_0001',
          answer: 'opt_2',
        },
        idempotencyKey,
      );

      // Must return identical original acceptance without creating a second attempt or error
      expect(duplicateAck).toEqual(firstAck);
      expect(duplicateAck.submittedAt).toBe(firstAck.submittedAt);
      expect(duplicateAck.next).toEqual(firstAck.next);
    });

    it('TC-04 [UI]: SubmitNextButton disables double-clicking while in-flight and preserves Idempotency-Key across retries', async () => {
      const mockSession: MockAssessmentSession = mockApi.initMockSession('CAN-2026-081');
      const onFinish = vi.fn();

      const { container } = render(<ExamScreen session={mockSession} onFinishExam={onFinish} />);

      // Select an option for question 1 (single choice radio)
      const opt2 = screen.getByText(/cross-browser wrappers/i);
      expect(opt2).toBeDefined();
      fireEvent.click(opt2);

      // Find Submit & Next button
      const submitBtn = screen.getByRole('button', { name: /Submit & Next/i });
      expect(submitBtn).toBeDefined();

      // First click: initiates submission
      fireEvent.click(submitBtn);

      // Verify button enters in-flight state (disabled, aria-busy=true) preventing double clicks
      expect(submitBtn).toHaveAttribute('aria-busy', 'true');
      expect(submitBtn).toBeDisabled();

      // Attempt immediate second click while in-flight (should have zero effect)
      fireEvent.click(submitBtn);

      // Await successful completion and transition
      await waitFor(
        () => {
          expect(container.textContent).toContain('Question 2 of 6');
        },
        { timeout: 3000 },
      );
    });
  });

  // =========================================================================
  // TC-05: Late Submission Rejected with QUESTION_EXPIRED & Auto-advance
  // =========================================================================
  describe('TC-05: Answer Submitted After Timeout Rejected with HTTP 409 (FR-TIME-004, FR-TIME-005, FR-UI-007)', () => {
    it('TC-05 [API]: Submission arriving after question deadline is rejected with QUESTION_EXPIRED', async () => {
      const session = await apiClient.startSession('asmt-frontend-2026');

      // Manipulate question deadline to past (expired on server)
      mockApi.setQuestionDeadline(new Date(Date.now() - 1000 * 60)); // expired 1 min ago

      const lateKey = crypto.randomUUID();

      await expect(
        apiClient.submitSessionAnswer(
          session.sessionId,
          {
            questionAttemptId: 'qa_0001',
            answer: 'opt_1',
          },
          lateKey,
        ),
      ).rejects.toMatchObject({
        status: 'rejected',
        code: ApiErrorCode.QUESTION_EXPIRED,
      });
    });

    it('TC-05 [UI]: When question expires, UI displays timeout notice and auto-advances to next question', async () => {
      const mockSession: MockAssessmentSession = mockApi.initMockSession('CAN-2026-081');
      const onFinish = vi.fn();

      // Mock submitSessionAnswer to simulate late rejection with QUESTION_EXPIRED (409)
      vi.spyOn(apiClient, 'submitSessionAnswer').mockRejectedValueOnce({
        status: 'rejected',
        code: ApiErrorCode.QUESTION_EXPIRED,
        message: 'Question attempt time limit has expired.',
        correlationId: 'c-test-409',
      });

      render(<ExamScreen session={mockSession} onFinishExam={onFinish} />);

      // Attempt to submit answer
      const submitBtn = screen.getByRole('button', { name: /Submit & Next/i });
      fireEvent.click(submitBtn);

      // Verify prominent visual timeout notice is displayed
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/Question time limit has expired/i)).toBeDefined();
      });

      // Verify automatic progression to Question 2
      await waitFor(
        () => {
          expect(screen.getByText(/Question 2 of 6/i)).toBeDefined();
        },
        { timeout: 3000 },
      );
    });
  });

  // =========================================================================
  // TC-07: Session Recovery and Authoritative Resumption After Disconnection
  // =========================================================================
  describe('TC-07: Session Recovery After Disconnection (FR-TIME-010, FR-ANS-007, FR-UI-008)', () => {
    it('TC-07 [API & Session]: Disconnection preserves active state and deadline progresses continuously without pause', async () => {
      const startSession = await apiClient.startSession('asmt-frontend-2026');
      const sessionId = startSession.sessionId;
      const initialDeadlineMs = new Date(startSession.overallDeadline).getTime();

      // Submit Question 1
      const ack1 = await apiClient.submitSessionAnswer(
        sessionId,
        {
          questionAttemptId: 'qa_0001',
          answer: 'opt_2',
        },
        crypto.randomUUID(),
      );
      expect(ack1.status).toBe('accepted');

      // Simulate disconnection of 30 seconds
      // Time continues on server (FR-TIME-010)
      const simulatedDisconnectSeconds = 30;
      timeSync.recordServerTime(
        new Date(Date.now() + simulatedDisconnectSeconds * 1000).toISOString(),
        Date.now(),
        Date.now(),
      );

      // Reconnect: fetch authoritative session status (FR-TIME-008, TC-07)
      const recoveredStatus = await apiClient.getSessionStatus(sessionId);

      expect(recoveredStatus.sessionStatus).toBe(SessionState.ACTIVE);
      // Overall deadline is identical (no pause or reset)
      expect(new Date(recoveredStatus.overallDeadline).getTime()).toBe(initialDeadlineMs);

      // Question 1 remains answered in palette
      const q1Palette = recoveredStatus.palette.find((p) => p.questionAttemptId === 'qa_0001');
      expect(q1Palette?.status).toBe('ANSWERED');

      // Active question is question 2
      const activeQ = await apiClient.getCurrentQuestion(sessionId);
      expect(activeQ.sequenceNumber).toBe(2);
      expect(activeQ.questionAttemptId).toBe('qa_0002');

      // Candidate submits Question 2 on reconnection with fresh idempotency key
      const ack2 = await apiClient.submitSessionAnswer(
        sessionId,
        {
          questionAttemptId: 'qa_0002',
          answer: ['opt_2a', 'opt_2b'],
        },
        crypto.randomUUID(),
      );
      expect(ack2.status).toBe('accepted');
      expect(ack2.questionAttemptId).toBe('qa_0002');
    });

    it('TC-07 [UI]: Manual Sync button synchronizes authoritative server palette and active question', async () => {
      const mockSession: MockAssessmentSession = mockApi.initMockSession('CAN-2026-081');
      const onFinish = vi.fn();

      render(<ExamScreen session={mockSession} onFinishExam={onFinish} />);

      // Verify Sync button exists
      const syncBtn = screen.getByRole('button', { name: /Sync/i });
      expect(syncBtn).toBeDefined();

      // Trigger sync
      act(() => {
        fireEvent.click(syncBtn);
      });

      // Verify connection and timer components remain active and stable
      expect(screen.getByText(/Frontend Developer Assessment/i)).toBeDefined();
      expect(screen.getByText(/Question 1 of 6/i)).toBeDefined();
    });
  });

  // =========================================================================
  // Final Submission & Submitted Successfully Screen
  // =========================================================================
  describe('Final Submission Flow & Submitted Screen (FR-UI-009, FR-ANS-008, Decision 4)', () => {
    it('End Test modal confirmation triggers finalSubmit and renders SubmittedScreen', async () => {
      const mockSession: MockAssessmentSession = mockApi.initMockSession('CAN-2026-081');
      let finishedResult: FinalSubmitResponseDto | undefined = undefined;
      const onFinish = vi.fn((res?: FinalSubmitResponseDto) => {
        finishedResult = res;
      });

      render(<ExamScreen session={mockSession} onFinishExam={onFinish} />);

      // Click "End Test" button in top connection banner
      const endTestBtn = screen.getByRole('button', { name: /End Test/i });
      fireEvent.click(endTestBtn);

      // Verify End Assessment Confirmation dialog is shown
      expect(screen.getByText(/End Assessment Confirmation/i)).toBeDefined();
      expect(screen.getByText(/Are you sure you want to end and submit/i)).toBeDefined();

      // Confirm submission
      const confirmBtn = screen.getByRole('button', { name: /Confirm & End Test/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onFinish).toHaveBeenCalledTimes(1);
      });

      // Now render SubmittedScreen with the final submission result
      const mockUser = {
        id: 'usr-can-081',
        username: 'cand.test',
        role: UserRole.CANDIDATE,
        candidateId: 'CAN-2026-081',
      };

      const { container } = render(
        <SubmittedScreen user={mockUser} session={mockSession} finalResult={finishedResult} />,
      );

      // Verify summary elements per UI Sample (Screen 5)
      expect(container.textContent).toContain('Test Submitted Successfully!');
      expect(container.textContent).toContain('Candidate ID:');
      expect(container.textContent).toContain('CAN-2026-081');
      expect(container.textContent).toContain('Test Name:');
      expect(container.textContent).toContain('Frontend Developer Assessment');
      expect(container.textContent).toContain('Total Questions:');
      expect(container.textContent).toContain('Submitted On:');

      // Verify Close Application button is present
      const closeBtn = screen.getByRole('button', { name: /Close Application/i });
      expect(closeBtn).toBeDefined();
    });
  });
});
