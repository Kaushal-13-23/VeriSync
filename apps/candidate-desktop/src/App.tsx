import React, { useReducer, useEffect } from 'react';
import { flowReducer, initialFlowState } from './state/flowMachine';
import { LoginScreen } from './screens/LoginScreen';
import { SystemCheckScreen } from './screens/SystemCheckScreen';
import { AssignedAssessmentsScreen } from './screens/AssignedAssessmentsScreen';
import { InstructionsScreen } from './screens/InstructionsScreen';
import { ExamScreen } from './screens/ExamScreen';
import { SubmittedScreen } from './screens/SubmittedScreen';
import { mockApi, MockAssessmentSession, MockUser } from './services/mockApi';
import { CandidateAssignedAssessment, CandidateFinalSubmitResponse } from './types/assessment';
import { tokenStorage } from './services/tokenStorage';
import { apiClient } from './services/apiClient';
import { SessionState, UserRole } from '@verisync/shared';

/**
 * Main Application Component for VeriSync Candidate Desktop
 * State Machine Flow per SRS Section 3.3, 3.4 & FR-UI-001 - FR-UI-009:
 * LOGIN -> SYSTEM_CHECK -> ASSIGNED_ASSESSMENTS -> INSTRUCTIONS -> EXAM -> SUBMITTED
 * Session Recovery: FR-TIME-010, FR-ANS-007, NFR-REL-004
 */

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);

  // Crash / Restart / Machine Reboot Recovery (FR-TIME-010, NFR-REL-004)
  useEffect(() => {
    let isMounted = true;
    const attemptRecovery = async () => {
      try {
        const activeMeta = await tokenStorage.getActiveSession();
        const token = await tokenStorage.getToken();
        if (activeMeta && token) {
          const status = await apiClient.getSessionStatus(activeMeta.sessionId);
          if (
            status.sessionStatus === SessionState.ACTIVE ||
            status.sessionStatus === SessionState.INTERRUPTED ||
            status.sessionStatus === ('ACTIVE' as unknown) ||
            status.sessionStatus === ('INTERRUPTED' as unknown)
          ) {
            const recoveredSession = mockApi.initMockSession(activeMeta.candidateId, activeMeta.assessmentId);
            recoveredSession.sessionId = activeMeta.sessionId;
            recoveredSession.title = activeMeta.title;
            const recoveredUser: MockUser = {
              id: `usr-${activeMeta.candidateId.toLowerCase()}`,
              username: activeMeta.candidateId,
              role: UserRole.CANDIDATE,
              candidateId: activeMeta.candidateId,
            };
            if (isMounted) {
              dispatch({
                type: 'RESUME_SESSION',
                payload: { session: recoveredSession, user: recoveredUser },
              });
            }
          } else if (
            status.sessionStatus === SessionState.SUBMITTED ||
            status.sessionStatus === ('SUBMITTED' as unknown)
          ) {
            void tokenStorage.clearActiveSession();
          }
        }
      } catch {
        // Fall back to clean login if session cannot be recovered
      }
    };

    void attemptRecovery();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (user: MockUser) => {
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
  };

  const handleSystemCheckContinue = () => {
    dispatch({ type: 'SYSTEM_CHECK_COMPLETE', payload: { passed: true } });
  };

  const handleSelectAssessment = (assessment: CandidateAssignedAssessment) => {
    dispatch({ type: 'SELECT_ASSESSMENT', payload: { assessment } });
  };

  const handleBackToAssessments = () => {
    dispatch({ type: 'BACK_TO_ASSESSMENTS' });
  };

  const handleStartExam = (session: MockAssessmentSession) => {
    void tokenStorage.setActiveSession({
      sessionId: session.sessionId,
      assessmentId: session.assessmentId,
      title: session.title,
      candidateId: session.candidateId,
      startedAt: session.startedAt,
    });
    dispatch({ type: 'TOGGLE_INSTRUCTIONS_ACK', payload: { acknowledged: true } });
    dispatch({ type: 'START_EXAM', payload: { session } });
  };

  const handleFinishExam = (finalResult?: CandidateFinalSubmitResponse) => {
    void tokenStorage.clearActiveSession();
    dispatch({ type: 'EXAM_SUBMITTED', payload: { finalResult } });
  };

  const handleLogout = () => {
    void tokenStorage.clearActiveSession();
    dispatch({ type: 'RESET_TO_LOGIN' });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
      }}
    >
      {state.currentScreen === 'LOGIN' && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {state.currentScreen === 'SYSTEM_CHECK' && (
        <SystemCheckScreen
          onContinue={handleSystemCheckContinue}
          hardwareProctoringEnabled={false} // Default OFF per docs/DECISIONS.md Decision 2
        />
      )}

      {state.currentScreen === 'ASSIGNED_ASSESSMENTS' && (
        <AssignedAssessmentsScreen
          user={state.user}
          onSelectAssessment={handleSelectAssessment}
          onLogout={handleLogout}
        />
      )}

      {state.currentScreen === 'INSTRUCTIONS' && state.user && (
        <InstructionsScreen
          user={state.user}
          assessment={state.selectedAssessment}
          onStartExam={handleStartExam}
          onBack={handleBackToAssessments}
        />
      )}

      {state.currentScreen === 'EXAM' && state.session && (
        <ExamScreen
          session={state.session}
          onFinishExam={handleFinishExam}
        />
      )}

      {state.currentScreen === 'SUBMITTED' && state.user && state.session && (
        <SubmittedScreen
          user={state.user}
          session={state.session}
          finalResult={state.finalResult}
        />
      )}
    </div>
  );
};

export default App;
