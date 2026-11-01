/**
 * Candidates Table with Status Chips, Pagination, and Actions
 * Traceability: FR-CAN-001, FR-CAN-002, FR-CAN-005, FR-CAN-007, UI_Sample.jpeg
 */

import React from 'react';
import {
  Eye,
  Edit3,
  UserX,
  UserCheck,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { CandidateRecord, CandidateAccountStatus } from '../../types/api';

interface CandidateTableProps {
  candidates: CandidateRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onViewDetails: (candidate: CandidateRecord) => void;
  onEditCandidate: (candidate: CandidateRecord) => void;
  onToggleStatus: (candidate: CandidateRecord) => void;
  onResetPassword: (candidate: CandidateRecord) => void;
}

const STATUS_CONFIG: Record<
  CandidateAccountStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  ACTIVE: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Inactive',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  LOCKED: {
    label: 'Locked',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  onPageChange,
  onLimitChange,
  onViewDetails,
  onEditCandidate,
  onToggleStatus,
  onResetPassword,
}) => {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Loading candidate roster...</p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center"
        data-testid="empty-candidates"
      >
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No candidates found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          No candidates match your current search and filter criteria. Try adjusting your filters or
          import new candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200" data-testid="candidates-table">
          <thead className="bg-slate-50/75">
            <tr>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Candidate ID
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Candidate Details
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Institution & Drive
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Tests Assigned
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {candidates.map((candidate) => {
              const statusCfg = STATUS_CONFIG[candidate.accountStatus] || STATUS_CONFIG.ACTIVE;

              return (
                <tr
                  key={candidate.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                  data-testid={`candidate-row-${candidate.candidateIdentifier}`}
                >
                  {/* Candidate Identifier */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {candidate.candidateIdentifier}
                    </span>
                  </td>

                  {/* Candidate Details */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => onViewDetails(candidate)}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-600 text-left transition-colors"
                      >
                        {candidate.fullName}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>@{candidate.username}</span>
                        <span>•</span>
                        <span>{candidate.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Institution & Drive */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-800 font-medium truncate max-w-xs">
                        {candidate.institution}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium border border-blue-100">
                          {candidate.recruitmentReference}
                        </span>
                        <span>Class of {candidate.graduationYear}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Chip */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.badgeClass}`}
                      data-testid={`status-badge-${candidate.candidateIdentifier}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* Tests Assigned */}
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full border border-blue-200">
                      {candidate.testsAssignedCount}
                    </span>
                  </td>

                  {/* Row Actions */}
                  <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDetails(candidate)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View profile & activity"
                        aria-label={`View details of ${candidate.fullName}`}
                        data-testid={`btn-view-${candidate.candidateIdentifier}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditCandidate(candidate)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit candidate details"
                        aria-label={`Edit ${candidate.fullName}`}
                        data-testid={`btn-edit-${candidate.candidateIdentifier}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(candidate)}
                        className={`p-1.5 rounded-md transition-colors ${
                          candidate.accountStatus === 'ACTIVE'
                            ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={
                          candidate.accountStatus === 'ACTIVE'
                            ? 'Deactivate candidate'
                            : 'Activate candidate'
                        }
                        aria-label={`Toggle status for ${candidate.fullName}`}
                        data-testid={`btn-toggle-${candidate.candidateIdentifier}`}
                      >
                        {candidate.accountStatus === 'ACTIVE' ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onResetPassword(candidate)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Reset candidate password"
                        aria-label={`Reset password for ${candidate.fullName}`}
                        data-testid={`btn-reset-pw-${candidate.candidateIdentifier}`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (UI Sample: 'Showing 1-6 of N') */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span data-testid="pagination-info">
            Showing{' '}
            <strong className="text-slate-800">
              {startItem}-{endItem}
            </strong>{' '}
            of <strong className="text-slate-800">{total}</strong> candidates
          </span>

          <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="py-1 px-2 border border-slate-300 rounded bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="pagination-limit-select"
            >
              <option value="6">6</option>
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
          </div>
        </div>

        {/* Previous / Next and Page Numbers */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="btn-prev-page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                page === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              data-testid={`page-number-${p}`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="btn-next-page"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
