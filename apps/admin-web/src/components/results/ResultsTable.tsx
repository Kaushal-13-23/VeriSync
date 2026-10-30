/**
 * VeriSync Assessment Results Table
 * Matches UI Sample Screen 6 (Table with #, Candidate Name, Assessment, Score, Status chip, Completed On, Actions, Pagination).
 * Traceability: FR-ADMIN-005, FR-SCORE-007, FR-SCORE-008, UI_Sample.jpeg
 */

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AssessmentResultRecord, UserRole } from '../../types/api';

interface ResultsTableProps {
  results: AssessmentResultRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onViewDetails: (result: AssessmentResultRecord) => void;
  onCorrectScore: (result: AssessmentResultRecord) => void;
  currentUserRole?: UserRole;
  isLoading?: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onViewDetails,
  onCorrectScore,
  currentUserRole = 'SUPER_ADMIN',
  isLoading = false,
}) => {
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4">Candidate Name</th>
              <th className="py-3.5 px-4">Assessment</th>
              <th className="py-3.5 px-4">Score</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Completed On</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Clock className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-600">
                      No assessment results match your criteria.
                    </p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your filters or search keywords.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              results.map((result, idx) => {
                const rowNumber = (page - 1) * limit + idx + 1;
                const isPass = result.passFailStatus === 'PASS';
                const isProvisional = result.status === 'PROVISIONAL';

                return (
                  <tr key={result.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* # Index */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-400 text-xs">
                      {rowNumber}
                    </td>

                    {/* Candidate Name & Identifier */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                        {result.candidateName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {result.candidateIdentifier} • {result.candidateEmail}
                      </div>
                    </td>

                    {/* Assessment Title */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{result.assessmentTitle}</div>
                      <div className="text-xs text-slate-400">
                        {result.timeTakenMinutes} mins taken
                      </div>
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 text-base">
                          {result.scorePercentage}%
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ({result.totalScore}/{result.maxScore} pts)
                        </span>
                      </div>
                    </td>

                    {/* Status Chip (Pass / Fail / Provisional) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Pass / Fail Chip per UI Sample */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-rose-50 text-rose-700 border-rose-200/80'
                          }`}
                        >
                          {isPass ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {isPass ? 'Pass' : 'Fail'}
                        </span>

                        {/* Provisional badge (FR-SCORE-008) */}
                        {isProvisional && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                            title="Provisional: Subjective answers pending manual evaluation"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Provisional
                          </span>
                        )}

                        {result.corrections && result.corrections.length > 0 && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title="Score corrected by administrator"
                          >
                            Corrected
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Completed On */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(result.completedOn)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDetails(result)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded-lg transition-colors"
                          title="View detailed question breakdown"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => onCorrectScore(result)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                            title="Correct candidate score (Audited)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching UI Sample ("Showing 1-5 of 892" with buttons) */}
      <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-700">
            {startRecord}-{endRecord}
          </span>{' '}
          of <span className="font-semibold text-slate-700">{total}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
            const pageNum = idx + 1;
            const isActive = pageNum === page;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'border border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && (
            <>
              <span className="px-1 text-slate-400">...</span>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                  page === totalPages
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'border border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
