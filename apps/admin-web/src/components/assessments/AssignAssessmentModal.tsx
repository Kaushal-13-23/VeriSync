/**
 * Candidate & Cohort Assessment Assignment Modal
 * Traceability: FR-CAN-004, FR-ASMT-007, Rule 1, UI_Sample.jpeg
 */

import React, { useState } from 'react';
import { X, UserCheck, Users, Search, CheckSquare, Square } from 'lucide-react';
import { AssessmentRecord, CandidateRecord } from '../../types/api';

interface AssignAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentRecord | null;
  candidates: CandidateRecord[];
  onAssign: (assessmentId: string, candidateIds: string[]) => Promise<void>;
}

export const AssignAssessmentModal: React.FC<AssignAssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  candidates,
  onAssign,
}) => {
  const [mode, setMode] = useState<'individual' | 'drive'>('individual');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectedDrive, setSelectedDrive] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !assessment) return null;

  // Filter candidates
  const activeCandidates = candidates.filter((c) => c.accountStatus === 'ACTIVE');
  const drives = Array.from(new Set(activeCandidates.map((c) => c.recruitmentReference)));

  const filteredCandidates = activeCandidates.filter((c) => {
    const matchesSearch =
      search === '' ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.candidateIdentifier.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesDrive = selectedDrive === 'ALL' || c.recruitmentReference === selectedDrive;
    return matchesSearch && matchesDrive;
  });

  const handleToggleCandidate = (id: string) => {
    const next = new Set(selectedCandidateIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCandidateIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedCandidateIds);
    filteredCandidates.forEach((c) => next.add(c.id));
    setSelectedCandidateIds(next);
  };

  const handleDeselectAllFiltered = () => {
    const next = new Set(selectedCandidateIds);
    filteredCandidates.forEach((c) => next.delete(c.id));
    setSelectedCandidateIds(next);
  };

  const handleSelectDriveCohort = (driveName: string) => {
    setSelectedDrive(driveName);
    const driveCandidates = activeCandidates.filter((c) => c.recruitmentReference === driveName);
    const next = new Set(selectedCandidateIds);
    driveCandidates.forEach((c) => next.add(c.id));
    setSelectedCandidateIds(next);
  };

  const handleSubmit = async () => {
    if (selectedCandidateIds.size === 0) return;

    try {
      setIsSubmitting(true);
      await onAssign(assessment.id, Array.from(selectedCandidateIds));
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="assign-assessment-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assign Assessment to Candidates</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: <strong className="text-slate-800">{assessment.title}</strong> (
              {assessment.roleCategory})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('individual')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                mode === 'individual'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600'
              }`}
              data-testid="btn-mode-individual"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Select Candidates</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('drive')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                mode === 'drive'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600'
              }`}
              data-testid="btn-mode-drive"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Recruitment Drive Cohort</span>
            </button>
          </div>

          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {selectedCandidateIds.size} Selected
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {mode === 'drive' ? (
            /* Drive Cohort Quick Select */
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Quickly allocate this assessment to all active candidates enrolled under a specific
                recruitment drive cohort:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {drives.map((drive) => {
                  const driveCount = activeCandidates.filter(
                    (c) => c.recruitmentReference === drive,
                  ).length;
                  const isSelected = selectedDrive === drive;

                  return (
                    <button
                      key={drive}
                      type="button"
                      onClick={() => handleSelectDriveCohort(drive)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      data-testid={`cohort-drive-${drive}`}
                    >
                      <h5 className="text-xs font-semibold text-slate-900">{drive}</h5>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {driveCount} active candidates
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Individual Candidate Selection with Search */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search candidates by name, ID, or email..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    data-testid="assign-search-input"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  data-testid="btn-select-all"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              </div>

              {filteredCandidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active candidates match your search.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {filteredCandidates.map((c) => {
                    const isChecked = selectedCandidateIds.has(c.id);

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleCandidate(c.id)}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                        data-testid={`assign-candidate-row-${c.candidateIdentifier}`}
                      >
                        <div className="flex items-center gap-3">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">
                              {c.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {c.candidateIdentifier} • {c.email}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                          {c.recruitmentReference}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {selectedCandidateIds.size} candidates will be scheduled for this assessment.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedCandidateIds.size === 0 || isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              data-testid="btn-confirm-assign"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Confirm Assignment</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
