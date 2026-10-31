import React, { useReducer } from 'react';
import { flowReducer, initialFlowState } from './state/flowMachine';
import { LoginScreen } from './screens/LoginScreen';
import { SystemCheckScreen } from './screens/SystemCheckScreen';
import { AssignedAssessmentsScreen } from './screens/AssignedAssessmentsScreen';
import { InstructionsScreen } from './screens/InstructionsScreen';
import { ExamScreen } from './screens/ExamScreen';
import { SubmittedScreen } from './screens/SubmittedScreen';
import { MockAssessmentSession, MockUser } from './services/mockApi';
import { CandidateAssignedAssessment } from './types/assessment';

/**
 * Main Application Component for VeriSync Candidate Desktop
 * State Machine Flow per SRS Section 3.3, 3.4 & FR-UI-001 - FR-UI-009:
 * LOGIN -> SYSTEM_CHECK -> ASSIGNED_ASSESSMENTS -> INSTRUCTIONS -> EXAM -> SUBMITTED
 */

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);

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
    dispatch({ type: 'TOGGLE_INSTRUCTIONS_ACK', payload: { acknowledged: true } });
    dispatch({ type: 'START_EXAM', payload: { session } });
  };

  const handleFinishExam = () => {
    dispatch({ type: 'EXAM_SUBMITTED' });
  };

  const handleLogout = () => {
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
      {state.currentScreen === 'LOGIN' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}

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
        <ExamScreen session={state.session} onFinishExam={handleFinishExam} />
      )}

      {state.currentScreen === 'SUBMITTED' && state.user && state.session && (
        <SubmittedScreen user={state.user} session={state.session} />
      )}
    </div>
  );
};

export default App;
