/**
 * Screen Flow State Machine for VeriSync Candidate Desktop
 * SRS Requirements:
 * - SRS Section 3.3: Assessment Session States (Not Started, Ready, Active, Submitted)
 * - SRS Section 3.4: Question Attempt States (Pending, Active, Submitted, Timed Out)
 * - FR-UI-001: Assigned assessment view post-login
 * - FR-UI-002: Mandatory instructions acknowledged before proceeding
 * - FR-UI-003: Sequential single-question presentation
 * - FR-UI-007: Final submission confirmation screen
 */

import { MockAssessmentSession, MockUser } from '../services/mockApi';
import { CandidateAssignedAssessment } from '../types/assessment';

export type ScreenState =
  | 'LOGIN'
  | 'SYSTEM_CHECK'
  | 'ASSIGNED_ASSESSMENTS'
  | 'INSTRUCTIONS'
  | 'EXAM'
  | 'SUBMITTED';

export interface FlowState {
  currentScreen: ScreenState;
  user: MockUser | null;
  systemCheckCompleted: boolean;
  selectedAssessment: CandidateAssignedAssessment | null;
  instructionsAcknowledged: boolean;
  session: MockAssessmentSession | null;
  currentQuestionIndex: number;
  markedForReview: Record<string, boolean>; // Local visual aid (Decision 4)
  savedAnswers: Record<string, unknown>;
  isSubmitting: boolean;
  error: string | null;
}

export type FlowAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: MockUser } }
  | { type: 'SYSTEM_CHECK_COMPLETE'; payload: { passed: boolean } }
  | { type: 'SELECT_ASSESSMENT'; payload: { assessment: CandidateAssignedAssessment } }
  | { type: 'BACK_TO_ASSESSMENTS' }
  | { type: 'TOGGLE_INSTRUCTIONS_ACK'; payload: { acknowledged: boolean } }
  | { type: 'START_EXAM'; payload: { session: MockAssessmentSession } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'SET_QUESTION_INDEX'; payload: { index: number } }
  | { type: 'RECORD_ANSWER'; payload: { questionAttemptId: string; response: unknown } }
  | { type: 'TOGGLE_MARK_REVIEW'; payload: { questionAttemptId: string } }
  | { type: 'SET_SUBMITTING'; payload: { isSubmitting: boolean } }
  | { type: 'EXAM_SUBMITTED' }
  | { type: 'RESET_TO_LOGIN' }
  | { type: 'SET_ERROR'; payload: { error: string | null } };

export const initialFlowState: FlowState = {
  currentScreen: 'LOGIN',
  user: null,
  systemCheckCompleted: false,
  selectedAssessment: null,
  instructionsAcknowledged: false,
  session: null,
  currentQuestionIndex: 0,
  markedForReview: {},
  savedAnswers: {},
  isSubmitting: false,
  error: null,
};

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        currentScreen: 'SYSTEM_CHECK',
        error: null,
      };

    case 'SYSTEM_CHECK_COMPLETE':
      if (!action.payload.passed) {
        return {
          ...state,
          error: 'System requirements not satisfied. Please resolve issues before proceeding.',
        };
      }
      return {
        ...state,
        systemCheckCompleted: true,
        currentScreen: 'ASSIGNED_ASSESSMENTS',
        error: null,
      };

    case 'SELECT_ASSESSMENT':
      return {
        ...state,
        selectedAssessment: action.payload.assessment,
        currentScreen: 'INSTRUCTIONS',
        instructionsAcknowledged: false,
        error: null,
      };

    case 'BACK_TO_ASSESSMENTS':
      return {
        ...state,
        currentScreen: 'ASSIGNED_ASSESSMENTS',
        instructionsAcknowledged: false,
        error: null,
      };

    case 'TOGGLE_INSTRUCTIONS_ACK':
      return {
        ...state,
        instructionsAcknowledged: action.payload.acknowledged,
      };

    case 'START_EXAM':
      if (!state.instructionsAcknowledged) {
        return {
          ...state,
          error: 'Instructions must be acknowledged before beginning the assessment.',
        };
      }
      return {
        ...state,
        session: action.payload.session,
        currentScreen: 'EXAM',
        currentQuestionIndex: 0,
        error: null,
      };

    case 'NEXT_QUESTION': {
      if (!state.session) return state;
      const nextIdx = state.currentQuestionIndex + 1;
      if (nextIdx >= state.session.questions.length) {
        return state;
      }
      return {
        ...state,
        currentQuestionIndex: nextIdx,
      };
    }

    case 'SET_QUESTION_INDEX': {
      if (!state.session) return state;
      if (action.payload.index < 0 || action.payload.index >= state.session.questions.length) {
        return state;
      }
      return {
        ...state,
        currentQuestionIndex: action.payload.index,
      };
    }

    case 'RECORD_ANSWER':
      return {
        ...state,
        savedAnswers: {
          ...state.savedAnswers,
          [action.payload.questionAttemptId]: action.payload.response,
        },
      };

    case 'TOGGLE_MARK_REVIEW': {
      const qId = action.payload.questionAttemptId;
      return {
        ...state,
        markedForReview: {
          ...state.markedForReview,
          [qId]: !state.markedForReview[qId],
        },
      };
    }

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.payload.isSubmitting,
      };

    case 'EXAM_SUBMITTED':
      return {
        ...state,
        currentScreen: 'SUBMITTED',
        isSubmitting: false,
        error: null,
      };

    case 'RESET_TO_LOGIN':
      return {
        ...initialFlowState,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
      };

    default:
      return state;
  }
}
