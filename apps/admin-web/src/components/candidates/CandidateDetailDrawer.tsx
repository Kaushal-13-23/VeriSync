/**
 * Candidate Detail Drawer Component
 * Displays candidate profile, assigned assessments, and authoritative login history.
 * Traceability: FR-CAN-001, FR-CAN-006, FR-AUTH-008, Rule 9
 */

import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Mail,
  Phone,
  KeyRound,
  Edit3,
} from 'lucide-react';
import { CandidateDetailProfile, CandidateRecord } from '../../types/api';

interface CandidateDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProfile?: CandidateDetailProfile | null;
  isLoading: boolean;
  onEdit: (candidate: CandidateRecord) => void;
  onResetPassword: (candidate: CandidateRecord) => void;
}

export const CandidateDetailDrawer: React.FC<CandidateDetailDrawerProps> = ({
  isOpen,
  onClose,
  candidateProfile,
  isLoading,
  onEdit,
  onResetPassword,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'security'>('overview');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity"
      data-testid="candidate-detail-drawer"
    >
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
              {candidateProfile?.fullName
                ? candidateProfile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'C'}
            </div>
            <div>
              <h3 className="font-semibold text-base text-white leading-tight">
                {candidateProfile?.fullName || 'Candidate Profile'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {candidateProfile?.candidateIdentifier} • @{candidateProfile?.username}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="drawer-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            data-testid="drawer-tab-overview"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assessments')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'assessments'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            data-testid="drawer-tab-assessments"
          >
            <span>Assigned Tests</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
              {candidateProfile?.assignments?.length || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            data-testid="drawer-tab-security"
          >
            <span>Login History</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm text-slate-500">Loading candidate details...</p>
            </div>
          ) : !candidateProfile ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Candidate profile unavailable.
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5" data-testid="drawer-overview-panel">
                  {/* Account Status Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Account Status
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            candidateProfile.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-500'
                              : candidateProfile.accountStatus === 'LOCKED'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-slate-800">{candidateProfile.accountStatus}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(candidateProfile)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        data-testid="drawer-edit-btn"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onResetPassword(candidateProfile)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                        data-testid="drawer-reset-pw-btn"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset PW</span>
                      </button>
                    </div>
                  </div>

                  {/* Personal & Academic Details */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-xs">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Academic & Enrollment</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Institution</span>
                        <span className="font-medium text-slate-800 mt-0.5 block">
                          {candidateProfile.institution}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Qualification</span>
                        <span className="font-medium text-slate-800 mt-0.5 block">
                          {candidateProfile.qualification}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Graduation Year</span>
                        <span className="font-medium text-slate-800 mt-0.5 block">
                          Class of {candidateProfile.graduationYear}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Recruitment Drive</span>
                        <span className="font-medium text-blue-700 mt-0.5 block">
                          {candidateProfile.recruitmentReference}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-xs">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Contact Details</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{candidateProfile.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{candidateProfile.phone || 'Phone not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          Enrolled on {new Date(candidateProfile.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ASSIGNED ASSESSMENTS */}
              {activeTab === 'assessments' && (
                <div className="space-y-3" data-testid="drawer-assessments-panel">
                  {candidateProfile.assignments.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-600 font-medium">No tests assigned yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assign this candidate from the Assessments page.
                      </p>
                    </div>
                  ) : (
                    candidateProfile.assignments.map((asgn) => (
                      <div
                        key={asgn.assignmentId}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5"
                        data-testid={`assignment-card-${asgn.assignmentId}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-semibold text-slate-900">
                              {asgn.assessmentTitle}
                            </h5>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {asgn.roleCategory}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                asgn.status === 'READY'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : asgn.status === 'SUBMITTED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : asgn.status === 'ACTIVE'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                              data-testid={`assignment-status-${asgn.assignmentId}`}
                            >
                              {asgn.status}
                            </span>
                            {asgn.attemptStatus && (
                              <span
                                className="text-[10px] font-mono text-slate-500"
                                data-testid={`attempt-status-${asgn.assignmentId}`}
                              >
                                Attempt: {asgn.attemptStatus}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submission and timing details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">
                              Submission State
                            </span>
                            <span
                              className="font-medium text-slate-700"
                              data-testid={`submission-status-${asgn.assignmentId}`}
                            >
                              {asgn.submissionStatus ||
                                (asgn.status === 'SUBMITTED' ? 'SUBMITTED' : 'NOT_SUBMITTED')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Session Ref</span>
                            <span className="font-mono text-slate-600">
                              {asgn.sessionId || asgn.assignmentId.replace('asgn-', 'sess-')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {asgn.scheduleWindow}
                          </span>
                          {asgn.score !== undefined && asgn.score !== null && (
                            <span className="font-semibold text-slate-700">
                              Score: {asgn.score} marks
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: LOGIN HISTORY (FR-CAN-006) */}
              {activeTab === 'security' && (
                <div className="space-y-3" data-testid="drawer-security-panel">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    Authoritative login timestamps in UTC ISO-8601 format (Rule 9).
                  </div>

                  {candidateProfile.loginHistory.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No recorded login activity yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {candidateProfile.loginHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-2 shadow-xs"
                          data-testid={`login-history-item-${item.id}`}
                        >
                          <div className="flex items-start gap-2.5">
                            {item.status === 'SUCCESS' ? (
                              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg mt-0.5">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg mt-0.5">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-800 font-mono">
                                  {item.ipAddress}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    item.status === 'SUCCESS'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.userAgent || 'Desktop App / Secure Session'}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] text-slate-400 font-mono shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
