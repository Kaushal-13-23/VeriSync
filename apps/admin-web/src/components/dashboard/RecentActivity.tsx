/**
 * Recent Activity Component
 * Displays system event timeline matching UI_Sample.jpeg.
 * Traceability: FR-ADMIN-001, FR-AUD-002, NFR-USE-001
 */

import React from 'react';
import { UserPlus, CalendarPlus, CheckCircle, HelpCircle } from 'lucide-react';
import { RecentActivityItem } from '../../types/api';

interface RecentActivityProps {
  items: RecentActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ items }) => {
  const getIcon = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'candidate_added':
        return {
          icon: UserPlus,
          bg: 'bg-blue-50',
          color: 'text-blue-600',
        };
      case 'assessment_scheduled':
        return {
          icon: CalendarPlus,
          bg: 'bg-indigo-50',
          color: 'text-indigo-600',
        };
      case 'test_completed':
        return {
          icon: CheckCircle,
          bg: 'bg-emerald-50',
          color: 'text-emerald-600',
        };
      case 'questions_added':
      default:
        return {
          icon: HelpCircle,
          bg: 'bg-amber-50',
          color: 'text-amber-600',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <h4 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Live platform operations feed (FR-ADMIN-001)
        </p>
      </div>

      <div className="mt-6 divide-y divide-slate-100">
        {items.map((item) => {
          const { icon: Icon, bg, color } = getIcon(item.type);
          return (
            <div
              key={item.id}
              className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3.5">
                <div
                  className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-slate-800">{item.title}</h5>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-4">
                {item.timeAgo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
