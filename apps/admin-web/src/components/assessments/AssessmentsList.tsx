/**
 * Assessments List View with Status Chips, Candidate Count, and Quick Actions
 * Traceability: FR-ASMT-001, FR-ASMT-003, FR-ASMT-006, UI_Sample.jpeg
 */

import React from 'react';
import {
  PlusCircle,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  HelpCircle,
  Search,
  UserPlus,
  PlayCircle,
  PauseCircle,
  Archive,
  X,
} from 'lucide-react';
import { AssessmentRecord, AssessmentStatus } from '../../types/api';

interface AssessmentsListProps {
  assessments: AssessmentRecord[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenCreateWizard: () => void;
  onOpenAssignModal: (assessment: AssessmentRecord) => void;
  onPublishAssessment: (assessmentId: string) => void;
  onRequestStatusChange?: (assessment: AssessmentRecord, targetStatus: AssessmentStatus) => void;
}

const STATUS_CONFIG: Record<
  AssessmentStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  ACTIVE: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  SUSPENDED: {
    label: 'Suspended',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  ARCHIVED: {
    label: 'Archived',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export const AssessmentsList: React.FC<AssessmentsListProps> = ({
  assessments,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreateWizard,
  onOpenAssignModal,
  onPublishAssessment,
  onRequestStatusChange,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500">Loading assessments catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="assessments-list-view">
      {/* Header card with Search and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Assessments Catalog</h2>
            <p className="text-sm text-slate-500">
              Manage live, scheduled, and draft assessments across all recruitment drives.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCreateWizard}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 self-start sm:self-auto"
            data-testid="btn-create-assessment"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Assessment</span>
          </button>
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-8 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by assessment title or role category..."
              className="block w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              data-testid="assessment-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="block w-full py-2 px-3 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
              data-testid="assessment-status-filter"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assessments Grid / Cards */}
      {assessments.length === 0 ? (
        <div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center"
          data-testid="empty-assessments"
        >
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No assessments found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by creating your first assessment using the 4-step wizard.
          </p>
          <button
            type="button"
            onClick={onOpenCreateWizard}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Assessment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assessments.map((asmt) => {
            const statusCfg = STATUS_CONFIG[asmt.status] || STATUS_CONFIG.DRAFT;

            return (
              <div
                key={asmt.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
                data-testid={`assessment-card-${asmt.id}`}
              >
                <div className="p-5 space-y-3">
                  {/* Top line: Role category + Status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {asmt.roleCategory}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.badgeClass}`}
                      data-testid={`status-badge-${asmt.id}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Assessment Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {asmt.title}
                  </h3>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {asmt.description || 'No description provided.'}
                  </p>

                  {/* Key Metadata Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{asmt.overallDuration} mins</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{asmt.questionsCount || asmt.questions?.length || 0} questions</span>
                    </div>

                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {new Date(asmt.startAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(asmt.endAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 col-span-2 text-blue-700 font-medium">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{asmt.assignedCandidatesCount || 0} candidates assigned</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action buttons */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {asmt.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => onPublishAssessment(asmt.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                        data-testid={`btn-publish-${asmt.id}`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Publish Test</span>
                      </button>
                    )}

                    {(asmt.status === 'ACTIVE' || asmt.status === 'SCHEDULED') &&
                      onRequestStatusChange && (
                        <button
                          type="button"
                          onClick={() => onRequestStatusChange(asmt, 'SUSPENDED')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                          data-testid={`btn-suspend-${asmt.id}`}
                          title="Suspend assessment access"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}

                    {asmt.status === 'SUSPENDED' && onRequestStatusChange && (
                      <button
                        type="button"
                        onClick={() => onRequestStatusChange(asmt, 'ACTIVE')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                        data-testid={`btn-resume-${asmt.id}`}
                        title="Resume assessment access"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    {(asmt.status === 'COMPLETED' || asmt.status === 'SUSPENDED') &&
                      onRequestStatusChange && (
                        <button
                          type="button"
                          onClick={() => onRequestStatusChange(asmt, 'ARCHIVED')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                          data-testid={`btn-archive-${asmt.id}`}
                          title="Archive assessment permanently"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive</span>
                        </button>
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(asmt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    data-testid={`btn-assign-${asmt.id}`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign Candidates</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
