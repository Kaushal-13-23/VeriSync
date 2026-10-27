/**
 * Stat Card Component
 * Displays platform metric with trend indicator and icon matching UI_Sample.jpeg.
 * Traceability: FR-ADMIN-001, NFR-USE-001
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
}) => {
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{formattedValue}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mt-4 flex items-center space-x-1.5 text-xs">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <TrendingUp className="w-3 h-3 mr-1" />
          {trend}
        </span>
        <span className="text-slate-400">vs last month</span>
      </div>
    </div>
  );
};
