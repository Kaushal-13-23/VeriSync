/**
 * Upcoming Assessments Component
 * Displays scheduled assessments matching UI_Sample.jpeg.
 * Traceability: FR-ASMT-006, FR-ADMIN-001, NFR-USE-001
 */

import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { UpcomingAssessmentItem } from '../../types/api';

interface UpcomingAssessmentsProps {
  assessments: UpcomingAssessmentItem[];
  onViewAll?: () => void;
}

export const UpcomingAssessments: React.FC<UpcomingAssessmentsProps> = ({
  assessments,
  onViewAll,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900 tracking-tight">
            Upcoming Assessments
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Scheduled test sessions (FR-ASMT-006)</p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 focus:outline-none"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {assessments.map((asmt) => (
          <div
            key={asmt.id}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">{asmt.title}</h5>
                <p className="text-xs text-slate-500 mt-0.5">{asmt.scheduleText}</p>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {asmt.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
