/**
 * VeriSync Candidate Ranking Table
 * Implements deterministic tie-breaking criteria:
 * 1. Score percentage descending
 * 2. Time taken ascending
 * 3. Candidate identifier alphabetical
 * Traceability: FR-SCORE-009, FR-ADMIN-005
 */

import React from 'react';
import { Trophy, Medal, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { CandidateRankingItem } from '../../types/api';

interface RankingTableProps {
  rankings: CandidateRankingItem[];
  isLoading?: boolean;
}

export const RankingTable: React.FC<RankingTableProps> = ({ rankings, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 shadow-2xs">
            <Medal className="w-3.5 h-3.5 text-slate-600" />
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 text-amber-900 font-bold text-xs border border-amber-700/30 shadow-2xs">
            <Medal className="w-3.5 h-3.5 text-amber-800" />
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-600 font-mono font-semibold text-xs border border-slate-200">
            #{rank}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50/75 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Deterministic Leaderboard & Rankings</h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Tie-breaks evaluated: 1. Score % → 2. Completion Time → 3. Candidate ID (FR-SCORE-009)
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono font-semibold">
          {rankings.length} Ranked Candidates
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-16 text-center">Rank</th>
              <th className="py-3 px-4">Candidate</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Result</th>
              <th className="py-3 px-4">Time Taken</th>
              <th className="py-3 px-4">Completed On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                  No ranked candidate results available for this assessment.
                </td>
              </tr>
            ) : (
              rankings.map((candidate) => {
                const isPass = candidate.passFailStatus === 'PASS';
                return (
                  <tr
                    key={candidate.candidateId}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">{getRankBadge(candidate.rank)}</td>

                    {/* Candidate */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{candidate.candidateName}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {candidate.candidateIdentifier}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">
                          {candidate.scorePercentage}%
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ({candidate.totalScore}/{candidate.maxScore} pts)
                        </span>
                      </div>
                    </td>

                    {/* Result */}
                    <td className="py-3 px-4">
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
                        {candidate.passFailStatus}
                      </span>
                    </td>

                    {/* Time Taken */}
                    <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{candidate.timeTakenMinutes} mins</span>
                      </div>
                    </td>

                    {/* Completed On */}
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(candidate.completedOn).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
