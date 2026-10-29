/**
 * Candidate Filters & Header Actions Component
 * Traceability: FR-CAN-001, FR-CAN-002, UI_Sample.jpeg
 */

import React from 'react';
import { Search, UserPlus, Upload, X } from 'lucide-react';

interface CandidateFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  driveFilter: string;
  onDriveFilterChange: (drive: string) => void;
  driveOptions: string[];
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
}

export const CandidateFilters: React.FC<CandidateFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  driveFilter,
  onDriveFilterChange,
  driveOptions,
  onOpenAddModal,
  onOpenImportModal,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 space-y-4">
      {/* Top row: Title and primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Candidates Roster</h2>
          <p className="text-sm text-slate-500">
            Manage student registrations, drive allocations, and candidate credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            data-testid="import-csv-btn"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            data-testid="add-candidate-btn"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Filter controls row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
        {/* Search input with debounced clear */}
        <div className="sm:col-span-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID, candidate name, username, or email..."
            className="block w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            data-testid="candidate-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Recruitment Drive filter */}
        <div className="sm:col-span-3">
          <select
            value={driveFilter}
            onChange={(e) => onDriveFilterChange(e.target.value)}
            className="block w-full py-2 px-3 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
            data-testid="candidate-drive-filter"
          >
            <option value="ALL">All Recruitment Drives</option>
            {driveOptions.map((drive) => (
              <option key={drive} value={drive}>
                {drive}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="block w-full py-2 px-3 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
            data-testid="candidate-status-filter"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
      </div>
    </div>
  );
};
