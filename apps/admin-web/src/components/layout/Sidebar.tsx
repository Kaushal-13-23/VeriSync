/**
 * VeriSync Sidebar Navigation
 * Matches docs/design/UI_Sample.jpeg navy theme and provides role-aware navigation.
 * Traceability: FR-ADMIN-001, FR-ADMIN-009, NFR-USE-001
 */

import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  BarChart3,
  History,
  Settings,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { UserRole } from '../../types/api';

export type NavigationTab =
  | 'dashboard'
  | 'live-sessions'
  | 'candidates'
  | 'question-bank'
  | 'assessments'
  | 'results'
  | 'reports'
  | 'audit-logs'
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['SUPER_ADMIN', 'TECHNICAL_EVALUATOR'],
  },
  {
    id: 'live-sessions',
    label: 'Live Sessions',
    icon: Radio,
    allowedRoles: ['SUPER_ADMIN', 'TECHNICAL_EVALUATOR'],
  },
  {
    id: 'candidates',
    label: 'Candidates',
    icon: Users,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    id: 'question-bank',
    label: 'Question Bank',
    icon: BookOpen,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    id: 'assessments',
    label: 'Assessments',
    icon: ClipboardList,
    allowedRoles: ['SUPER_ADMIN', 'TECHNICAL_EVALUATOR'],
  },
  {
    id: 'results',
    label: 'Results',
    icon: Award,
    allowedRoles: ['SUPER_ADMIN', 'TECHNICAL_EVALUATOR'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    allowedRoles: ['SUPER_ADMIN', 'TECHNICAL_EVALUATOR'],
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: History,
    allowedRoles: ['SUPER_ADMIN', 'TECHNICAL_EVALUATOR'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    allowedRoles: ['SUPER_ADMIN'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SUPER_ADMIN';

  const visibleItems = NAV_ITEMS.filter((item) => item.allowedRoles.includes(currentRole));

  return (
    <aside
      className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none"
      aria-label="Main Navigation"
    >
      <div>
        {/* Brand Header */}
        <div className="px-6 py-6 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">VeriSync</h2>
            <p className="text-[11px] text-slate-400 font-medium">Administrator Portal</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5" aria-label="Sidebar Menu">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role and Platform Badge */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Role:</span>
            <span className="font-semibold text-blue-400 font-mono text-[11px]">
              {user?.role === 'TECHNICAL_EVALUATOR' ? 'Evaluator' : 'Super Admin'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">SRS Baseline v1.1</div>
        </div>
      </div>
    </aside>
  );
};
