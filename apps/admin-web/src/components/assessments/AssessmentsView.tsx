/**
 * VeriSync Assessments Management View
 * Toggles between Catalog List and 4-Step Create Wizard.
 * Traceability: FR-ASMT-001..008, Decision 5, Rule 1, UI_Sample.jpeg
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '../../api/assessments';
import { questionsApi } from '../../api/questions';
import { candidatesApi } from '../../api/candidates';
import { AssessmentRecord, CreateAssessmentPayload } from '../../types/api';
import { AssessmentsList } from './AssessmentsList';
import { AssessmentWizard } from './AssessmentWizard';
import { AssignAssessmentModal } from './AssignAssessmentModal';
import { toastManager } from '../../lib/toast';
import { AlertCircle } from 'lucide-react';

export const AssessmentsView: React.FC = () => {
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assignmentAssessment, setAssignmentAssessment] = useState<AssessmentRecord | null>(null);

  // Fetch assessments query
  const { data, isLoading, error } = useQuery({
    queryKey: ['assessments', { status: statusFilter, search }],
    queryFn: () =>
      assessmentsApi.getAssessments({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const assessments = data?.assessments || [];

  // Fetch available questions for the wizard
  const { data: questionsData } = useQuery({
    queryKey: ['questions', 'wizard-pool'],
    queryFn: () => questionsApi.getQuestions(),
  });

  // Fetch candidates for assignment modal
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates', 'assignment-pool'],
    queryFn: () => candidatesApi.getCandidates({ limit: 100 }),
  });

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateAssessmentPayload) => assessmentsApi.createAssessment(payload),
    onSuccess: (newAsmt) => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      return newAsmt;
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Failed to create assessment.',
      });
    },
  });

  // Publish assessment mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => assessmentsApi.publishAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toastManager.show({
        type: 'success',
        title: 'Assessment Published',
        message: 'Immutable version snapshot frozen and published for candidates.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Publish Failed',
        message: err.message || 'Failed to publish assessment.',
      });
    },
  });

  // Assign candidates mutation
  const assignMutation = useMutation({
    mutationFn: ({
      assessmentId,
      candidateIds,
    }: {
      assessmentId: string;
      candidateIds: string[];
    }) => candidatesApi.assignAssessment({ assessmentId, candidateIds }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toastManager.show({
        type: 'success',
        title: 'Candidates Assigned',
        message: `Successfully allocated assessment to ${result.assignedCount} candidates.`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Assignment Failed',
        message: err.message || 'Failed to assign assessment to candidates.',
      });
    },
  });

  const handleWizardSubmit = async (
    payload: CreateAssessmentPayload,
    publishImmediately: boolean,
  ) => {
    const created = await createMutation.mutateAsync(payload);
    if (publishImmediately && created?.id) {
      await publishMutation.mutateAsync(created.id);
    } else {
      toastManager.show({
        type: 'success',
        title: 'Draft Saved',
        message: 'Assessment saved as draft successfully.',
      });
    }
    setIsCreating(false);
  };

  const handleAssignSubmit = async (assessmentId: string, candidateIds: string[]) => {
    await assignMutation.mutateAsync({ assessmentId, candidateIds });
  };

  return (
    <div className="space-y-6" data-testid="assessments-view">
      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Unable to fetch assessments</h4>
            <p className="text-xs text-rose-600 mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Main View: Wizard OR Catalog List */}
      {isCreating ? (
        <AssessmentWizard
          availableQuestions={questionsData?.questions || []}
          onCancel={() => setIsCreating(false)}
          onSubmit={handleWizardSubmit}
        />
      ) : (
        <AssessmentsList
          assessments={assessments}
          isLoading={isLoading}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onOpenCreateWizard={() => setIsCreating(true)}
          onOpenAssignModal={(asmt) => setAssignmentAssessment(asmt)}
          onPublishAssessment={(id) => publishMutation.mutate(id)}
        />
      )}

      {/* Assignment Modal */}
      <AssignAssessmentModal
        isOpen={Boolean(assignmentAssessment)}
        onClose={() => setAssignmentAssessment(null)}
        assessment={assignmentAssessment}
        candidates={candidatesData?.candidates || []}
        onAssign={handleAssignSubmit}
      />
    </div>
  );
};
