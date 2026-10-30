/**
 * VeriSync Candidates Management View
 * Implements complete candidate roster, search, filtering, pagination, drawer, modals, and CSV import.
 * Traceability: FR-CAN-001..007, FR-AUTH-005, FR-AUTH-009, Rule 1, Rule 6, UI_Sample.jpeg
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesApi } from '../../api/candidates';
import { CandidateRecord, CandidateInput, CandidateAccountStatus } from '../../types/api';
import { CandidateFilters } from './CandidateFilters';
import { CandidateTable } from './CandidateTable';
import { CandidateFormModal } from './CandidateFormModal';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import { CsvImportModal } from './CsvImportModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { toastManager } from '../../lib/toast';
import { AlertCircle, AlertTriangle } from 'lucide-react';

const DEFAULT_DRIVES = [
  'Autumn Campus 2026',
  'Lateral Drive 2026',
  'Internship Hiring 2026',
  'Spring Campus 2026',
];

export const CandidatesView: React.FC = () => {
  const queryClient = useQueryClient();

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [driveFilter, setDriveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  // Modal & Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<CandidateRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [candidateToResetPw, setCandidateToResetPw] = useState<CandidateRecord | null>(null);
  const [candidateToToggleStatus, setCandidateToToggleStatus] = useState<CandidateRecord | null>(
    null,
  );
  const [detailCandidateId, setDetailCandidateId] = useState<string | null>(null);

  // Fetch candidates query
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'candidates',
      { search: searchQuery, status: statusFilter, drive: driveFilter, page, limit },
    ],
    queryFn: () =>
      candidatesApi.getCandidates({
        search: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as CandidateAccountStatus) : undefined,
        drive: driveFilter !== 'ALL' ? driveFilter : undefined,
        page,
        limit,
      }),
  });

  // Fetch candidate detail query when drawer is open
  const { data: candidateDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['candidate-detail', detailCandidateId],
    queryFn: () => candidatesApi.getCandidateById(detailCandidateId!),
    enabled: Boolean(detailCandidateId),
  });

  // Create candidate mutation
  const createMutation = useMutation({
    mutationFn: (input: CandidateInput) => candidatesApi.createCandidate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toastManager.show({
        type: 'success',
        title: 'Candidate Registered',
        message: 'New candidate registered and enrolled into assessment roster.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'Failed to create candidate.',
      });
    },
  });

  // Update candidate mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CandidateInput> }) =>
      candidatesApi.updateCandidate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      if (detailCandidateId) {
        queryClient.invalidateQueries({ queryKey: ['candidate-detail', detailCandidateId] });
      }
      toastManager.show({
        type: 'success',
        title: 'Profile Updated',
        message: 'Candidate details saved successfully.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update candidate.',
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: CandidateAccountStatus;
      reason: string;
    }) => candidatesApi.setCandidateStatus(id, status, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      if (detailCandidateId) {
        queryClient.invalidateQueries({ queryKey: ['candidate-detail', detailCandidateId] });
      }
      setCandidateToToggleStatus(null);
      toastManager.show({
        type: 'success',
        title: `Account ${vars.status}`,
        message: `Candidate account marked as ${vars.status.toLowerCase()}.`,
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Status Update Failed',
        message: err.message || 'Could not update candidate status.',
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => candidatesApi.resetPassword(id),
    onSuccess: () => {
      toastManager.show({
        type: 'success',
        title: 'Password Reset',
        message: 'Temporary password generated successfully.',
      });
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Reset Failed',
        message: err.message || 'Failed to generate temporary password.',
      });
    },
  });

  // CSV Import mutation
  const importCsvMutation = useMutation({
    mutationFn: (csvText: string) => candidatesApi.importCsv(csvText),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      if (result.errorCount === 0) {
        toastManager.show({
          type: 'success',
          title: 'CSV Import Completed',
          message: `All ${result.importedCount} candidates registered without errors.`,
        });
      } else {
        toastManager.show({
          type: 'warning',
          title: 'CSV Import Partial',
          message: `Imported ${result.importedCount} rows with ${result.errorCount} validation errors.`,
        });
      }
    },
    onError: (err: Error) => {
      toastManager.show({
        type: 'error',
        title: 'Import Failed',
        message: err.message || 'Failed to process CSV file.',
      });
    },
  });

  const driveOptions = useMemo(() => {
    const list = new Set(DEFAULT_DRIVES);
    if (data?.candidates) {
      data.candidates.forEach((c) => {
        if (c.recruitmentReference) list.add(c.recruitmentReference);
      });
    }
    return Array.from(list);
  }, [data]);

  const handleFormSubmit = async (input: CandidateInput) => {
    if (candidateToEdit) {
      await updateMutation.mutateAsync({ id: candidateToEdit.id, input });
      setCandidateToEdit(null);
    } else {
      const res = await createMutation.mutateAsync(input);
      return res;
    }
  };

  const handleConfirmToggleStatus = () => {
    if (!candidateToToggleStatus) return;
    const nextStatus: CandidateAccountStatus =
      candidateToToggleStatus.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    toggleStatusMutation.mutate({
      id: candidateToToggleStatus.id,
      status: nextStatus,
      reason: `Admin toggle via web interface (${nextStatus})`,
    });
  };

  return (
    <div className="space-y-6" data-testid="candidates-view">
      {/* Search and Filters */}
      <CandidateFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        driveFilter={driveFilter}
        onDriveFilterChange={(d) => {
          setDriveFilter(d);
          setPage(1);
        }}
        driveOptions={driveOptions}
        onOpenAddModal={() => {
          setCandidateToEdit(null);
          setIsAddModalOpen(true);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      {/* Query Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Unable to fetch candidates</h4>
            <p className="text-xs text-rose-600 mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Candidate Table */}
      <CandidateTable
        candidates={data?.candidates || []}
        total={data?.total || 0}
        page={data?.page || page}
        limit={data?.limit || limit}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onViewDetails={(can) => setDetailCandidateId(can.id)}
        onEditCandidate={(can) => {
          setCandidateToEdit(can);
          setIsAddModalOpen(true);
        }}
        onToggleStatus={(can) => setCandidateToToggleStatus(can)}
        onResetPassword={(can) => setCandidateToResetPw(can)}
      />

      {/* Add / Edit Candidate Modal */}
      <CandidateFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCandidateToEdit(null);
        }}
        candidateToEdit={candidateToEdit}
        onSubmit={handleFormSubmit}
        driveOptions={driveOptions}
      />

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        isOpen={Boolean(detailCandidateId)}
        onClose={() => setDetailCandidateId(null)}
        candidateProfile={candidateDetail}
        isLoading={isLoadingDetail}
        onEdit={(can) => {
          setCandidateToEdit(can);
          setIsAddModalOpen(true);
        }}
        onResetPassword={(can) => setCandidateToResetPw(can)}
      />

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(csv) => importCsvMutation.mutateAsync(csv)}
        onSuccessRefresh={() => queryClient.invalidateQueries({ queryKey: ['candidates'] })}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={Boolean(candidateToResetPw)}
        onClose={() => setCandidateToResetPw(null)}
        candidate={candidateToResetPw}
        onConfirmReset={async (id) => {
          const res = await resetPasswordMutation.mutateAsync(id);
          return res.temporaryPassword;
        }}
      />

      {/* Deactivate / Activate Confirmation Modal */}
      {candidateToToggleStatus && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          data-testid="toggle-status-modal"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  candidateToToggleStatus.accountStatus === 'ACTIVE'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {candidateToToggleStatus.accountStatus === 'ACTIVE'
                    ? 'Deactivate Candidate Account?'
                    : 'Activate Candidate Account?'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {candidateToToggleStatus.candidateIdentifier} • {candidateToToggleStatus.fullName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {candidateToToggleStatus.accountStatus === 'ACTIVE'
                ? 'Deactivating this candidate prevents them from logging in, starting new assessments, or submitting code. All existing audit records and submissions will remain preserved.'
                : 'Activating this account will restore access for the candidate to participate in scheduled assessments.'}
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCandidateToToggleStatus(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${
                  candidateToToggleStatus.accountStatus === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                data-testid="btn-confirm-toggle-status"
              >
                {candidateToToggleStatus.accountStatus === 'ACTIVE'
                  ? 'Confirm Deactivation'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
