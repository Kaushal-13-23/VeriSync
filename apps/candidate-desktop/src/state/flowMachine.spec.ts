import { describe, it, expect } from 'vitest';
import { flowReducer, initialFlowState, FlowState } from './flowMachine';
import { MockAssessmentSession, MockUser } from '../services/mockApi';
import { UserRole } from '@verisync/shared';

/**
 * Screen Flow State Machine Tests
 * SRS Requirements:
 * - SRS Section 3.3: Assessment Session States (Not Started, Ready, Active, Submitted)
 * - SRS Section 3.4: Question Attempt States (Pending, Active, Submitted)
 * - FR-UI-001: Assigned assessment progression
 * - FR-UI-002: Mandatory instructions acknowledgement guard
 * - FR-UI-003: Sequential single-question mode
 * - FR-UI-007: Final submission transition
 * - Decision 1 & 4: Strict sequential flow and local review flag
 */

describe('flowMachine (SRS Section 3.3, 3.4 & FR-UI-001 - FR-UI-007)', () => {
  const dummyUser: MockUser = {
    id: 'usr_001',
    username: 'vimal',
    role: UserRole.CANDIDATE,
    candidateId: 'CAN-2026-081',
  };

  const dummySession: MockAssessmentSession = {
    sessionId: 'sess_test',
    assessmentId: 'asmt_001',
    title: 'Frontend Developer Assessment',
    candidateId: 'CAN-2026-081',
    totalQuestions: 3,
    totalDurationMinutes: 90,
    startedAt: new Date().toISOString(),
    overallDeadlineAt: new Date(Date.now() + 5400000).toISOString(),
    currentQuestionIndex: 0,
    questions: [
      {
        id: 'q1',
        attemptId: 'qa_001',
        index: 1,
        totalQuestions: 3,
        section: 'MCQ',
        title: 'Q1',
        statement: 'Q1 statement',
        type: 'single_choice',
        durationMinutes: 2,
      },
      {
        id: 'q2',
        attemptId: 'qa_002',
        index: 2,
        totalQuestions: 3,
        section: 'Coding',
        title: 'Q2',
        statement: 'Q2 statement',
        type: 'coding',
        durationMinutes: 15,
      },
      {
        id: 'q3',
        attemptId: 'qa_003',
        index: 3,
        totalQuestions: 3,
        section: 'SQL',
        title: 'Q3',
        statement: 'Q3 statement',
        type: 'sql',
        durationMinutes: 10,
      },
    ],
    answeredAttemptIds: new Set<string>(),
    markedForReviewIds: new Set<string>(),
    isFinalSubmitted: false,
  };

  it('FR-UI-001: transitions from LOGIN to SYSTEM_CHECK upon successful authentication', () => {
    const next = flowReducer(initialFlowState, {
      type: 'LOGIN_SUCCESS',
      payload: { user: dummyUser },
    });

    expect(next.currentScreen).toBe('SYSTEM_CHECK');
    expect(next.user).toEqual(dummyUser);
    expect(next.error).toBeNull();
  });

  it('FR-LAB-001: transitions from SYSTEM_CHECK to ASSIGNED_ASSESSMENTS when checks pass', () => {
    const loggedInState: FlowState = {
      ...initialFlowState,
      currentScreen: 'SYSTEM_CHECK',
      user: dummyUser,
    };

    const next = flowReducer(loggedInState, {
      type: 'SYSTEM_CHECK_COMPLETE',
      payload: { passed: true },
    });

    expect(next.currentScreen).toBe('ASSIGNED_ASSESSMENTS');
    expect(next.systemCheckCompleted).toBe(true);
    expect(next.error).toBeNull();
  });

  it('FR-UI-001: transitions from ASSIGNED_ASSESSMENTS to INSTRUCTIONS when assessment is selected', () => {
    const onAssessmentsState: FlowState = {
      ...initialFlowState,
      currentScreen: 'ASSIGNED_ASSESSMENTS',
      user: dummyUser,
      systemCheckCompleted: true,
    };

    const dummyAssessment = {
      assignmentId: 'asgn_01',
      assessmentId: 'asmt_001',
      title: 'Frontend Developer Assessment',
      roleCategory: 'Frontend',
      overallDuration: 90,
      totalMarks: 100,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      status: 'ACTIVE',
      attemptLimit: 1,
      attemptsUsed: 0,
      attemptsRemaining: 1,
      isEligible: true,
      navigationMode: 'SEQUENTIAL' as const,
      serverTime: new Date().toISOString(),
    };

    const next = flowReducer(onAssessmentsState, {
      type: 'SELECT_ASSESSMENT',
      payload: { assessment: dummyAssessment },
    });

    expect(next.currentScreen).toBe('INSTRUCTIONS');
    expect(next.selectedAssessment).toEqual(dummyAssessment);
    expect(next.instructionsAcknowledged).toBe(false);
  });

  it('allows navigating back from INSTRUCTIONS to ASSIGNED_ASSESSMENTS', () => {
    const onInstructionsState: FlowState = {
      ...initialFlowState,
      currentScreen: 'INSTRUCTIONS',
      user: dummyUser,
      systemCheckCompleted: true,
      instructionsAcknowledged: true,
    };

    const next = flowReducer(onInstructionsState, {
      type: 'BACK_TO_ASSESSMENTS',
    });

    expect(next.currentScreen).toBe('ASSIGNED_ASSESSMENTS');
    expect(next.instructionsAcknowledged).toBe(false);
  });

  it('FR-LAB-006: prevents advancement when system check fails', () => {
    const loggedInState: FlowState = {
      ...initialFlowState,
      currentScreen: 'SYSTEM_CHECK',
      user: dummyUser,
    };

    const next = flowReducer(loggedInState, {
      type: 'SYSTEM_CHECK_COMPLETE',
      payload: { passed: false },
    });

    expect(next.currentScreen).toBe('SYSTEM_CHECK');
    expect(next.systemCheckCompleted).toBe(false);
    expect(next.error).toContain('System requirements not satisfied');
  });

  it('FR-UI-002: rejects START_EXAM if instructions have not been acknowledged', () => {
    const onInstructions: FlowState = {
      ...initialFlowState,
      currentScreen: 'INSTRUCTIONS',
      user: dummyUser,
      systemCheckCompleted: true,
      instructionsAcknowledged: false,
    };

    const next = flowReducer(onInstructions, {
      type: 'START_EXAM',
      payload: { session: dummySession },
    });

    expect(next.currentScreen).toBe('INSTRUCTIONS');
    expect(next.error).toContain('Instructions must be acknowledged');
  });

  it('FR-UI-002 & FR-UI-003: transitions to EXAM when instructions are acknowledged', () => {
    const onInstructions: FlowState = {
      ...initialFlowState,
      currentScreen: 'INSTRUCTIONS',
      user: dummyUser,
      systemCheckCompleted: true,
      instructionsAcknowledged: true,
    };

    const next = flowReducer(onInstructions, {
      type: 'START_EXAM',
      payload: { session: dummySession },
    });

    expect(next.currentScreen).toBe('EXAM');
    expect(next.session).toEqual(dummySession);
    expect(next.currentQuestionIndex).toBe(0);
    expect(next.error).toBeNull();
  });

  it('FR-TIME-009 & Decision 1: sequentially advances question index', () => {
    const inExam: FlowState = {
      ...initialFlowState,
      currentScreen: 'EXAM',
      user: dummyUser,
      session: dummySession,
      currentQuestionIndex: 0,
    };

    const step1 = flowReducer(inExam, { type: 'NEXT_QUESTION' });
    expect(step1.currentQuestionIndex).toBe(1);

    const step2 = flowReducer(step1, { type: 'NEXT_QUESTION' });
    expect(step2.currentQuestionIndex).toBe(2);

    // Bounded by questions length
    const step3 = flowReducer(step2, { type: 'NEXT_QUESTION' });
    expect(step3.currentQuestionIndex).toBe(2);
  });

  it('Decision 4: toggles local Mark for Review flag without mutating backend state', () => {
    const inExam: FlowState = {
      ...initialFlowState,
      currentScreen: 'EXAM',
      user: dummyUser,
      session: dummySession,
      currentQuestionIndex: 0,
    };

    const marked = flowReducer(inExam, {
      type: 'TOGGLE_MARK_REVIEW',
      payload: { questionAttemptId: 'qa_001' },
    });
    expect(marked.markedForReview['qa_001']).toBe(true);

    const unmarked = flowReducer(marked, {
      type: 'TOGGLE_MARK_REVIEW',
      payload: { questionAttemptId: 'qa_001' },
    });
    expect(unmarked.markedForReview['qa_001']).toBe(false);
  });

  it('FR-UI-007: transitions from EXAM to SUBMITTED upon final submission', () => {
    const inExam: FlowState = {
      ...initialFlowState,
      currentScreen: 'EXAM',
      user: dummyUser,
      session: dummySession,
      currentQuestionIndex: 2,
    };

    const next = flowReducer(inExam, { type: 'EXAM_SUBMITTED' });
    expect(next.currentScreen).toBe('SUBMITTED');
    expect(next.isSubmitting).toBe(false);
  });
});
