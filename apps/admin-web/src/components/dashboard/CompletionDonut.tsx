/**
 * Test Completion Rate Donut Chart Component
 * High-precision SVG donut chart with breakdown legend matching UI_Sample.jpeg.
 * Traceability: FR-ADMIN-001, FR-ADMIN-003, NFR-USE-001
 */

import React from 'react';
import { CompletionRateStats } from '../../types/api';

interface CompletionDonutProps {
  stats: CompletionRateStats;
}

export const CompletionDonut: React.FC<CompletionDonutProps> = ({ stats }) => {
  const total = stats.completed + stats.inProgress + stats.notStarted;
  const safeTotal = total > 0 ? total : 1;

  const completedPct = (stats.completed / safeTotal) * 100;
  const inProgressPct = (stats.inProgress / safeTotal) * 100;
  const notStartedPct = (stats.notStarted / safeTotal) * 100;

  // SVG parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159

  const completedDash = (completedPct / 100) * circumference;
  const inProgressDash = (inProgressPct / 100) * circumference;
  const notStartedDash = (notStartedPct / 100) * circumference;

  // Offsets
  const completedOffset = 0;
  const inProgressOffset = -completedDash;
  const notStartedOffset = -(completedDash + inProgressDash);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <h4 className="text-base font-bold text-slate-900 tracking-tight">Test Completion Rate</h4>
        <p className="text-xs text-slate-500 mt-0.5">Assessment lifecycle progression (SRS 3.3)</p>
      </div>

      <div className="my-6 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
            {/* Background track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="text-slate-100"
              strokeWidth="16"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Completed Segment (Blue) */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="text-blue-600 transition-all duration-700 ease-out"
              strokeWidth="16"
              strokeDasharray={`${completedDash} ${circumference}`}
              strokeDashoffset={completedOffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
            {/* In Progress Segment (Cyan) */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="text-cyan-500 transition-all duration-700 ease-out"
              strokeWidth="16"
              strokeDasharray={`${inProgressDash} ${circumference}`}
              strokeDashoffset={inProgressOffset}
              stroke="currentColor"
              fill="transparent"
            />
            {/* Not Started Segment (Slate) */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="text-slate-300 transition-all duration-700 ease-out"
              strokeWidth="16"
              strokeDasharray={`${notStartedDash} ${circumference}`}
              strokeDashoffset={notStartedOffset}
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.percentage}%
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Completed
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:space-x-8 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-slate-600 font-medium">Completed</span>
            </div>
            <span className="font-bold text-slate-900">{stats.completed.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between sm:space-x-8 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-slate-600 font-medium">In Progress</span>
            </div>
            <span className="font-bold text-slate-900">{stats.inProgress.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between sm:space-x-8 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="text-slate-600 font-medium">Not Started</span>
            </div>
            <span className="font-bold text-slate-900">{stats.notStarted.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
