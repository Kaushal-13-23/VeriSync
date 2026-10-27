/**
 * Navigation Tab Feature Placeholder
 * Outlines future phase capabilities and requirements traceability.
 */

import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { NavigationTab } from '../layout/Sidebar';

interface TabPlaceholderProps {
  tab: NavigationTab;
  onReturnToDashboard: () => void;
}

const TAB_DETAILS: Record<
  NavigationTab,
  { title: string; phase: string; srsIds: string; description: string }
> = {
  dashboard: {
    title: 'Dashboard',
    phase: 'Phase 1 (Completed)',
    srsIds: 'FR-ADMIN-001, FR-ADMIN-002, FR-ADMIN-003',
    description: 'Platform overview metrics, recent activity, and completion rate.',
  },
  candidates: {
    title: 'Candidate Management',
    phase: 'Phase 2 (Candidate & Lab)',
    srsIds: 'FR-CAN-001 through FR-CAN-007',
    description: 'Candidate profile provisioning, CSV bulk import, and assessment assignment.',
  },
  'question-bank': {
    title: 'Question Bank Management',
    phase: 'Phase 3 (Content & Assessments)',
    srsIds: 'FR-QB-001 through FR-QB-010',
    description:
      'Question authoring (MCQ, Short Answer, Coding, SQL) and versioned snapshot immutability.',
  },
  assessments: {
    title: 'Assessment Configuration',
    phase: 'Phase 3 (Content & Assessments)',
    srsIds: 'FR-ASMT-001 through FR-ASMT-008, Decision 5',
    description:
      '4-step assessment creation wizard with per-question deadlines and navigation modes.',
  },
  results: {
    title: 'Assessment Results & Rankings',
    phase: 'Phase 5 (Results & Evaluation)',
    srsIds: 'FR-SCORE-001 through FR-SCORE-010, FR-ADMIN-005',
    description:
      'Candidate score aggregation, rubric-based evaluation queue, and audited score corrections.',
  },
  reports: {
    title: 'Platform Analytics & Reports',
    phase: 'Phase 5 (Reporting & Analytics)',
    srsIds: 'FR-ADMIN-005, FR-ADMIN-006, FR-ADMIN-007',
    description:
      'Question discrimination indices, completion times, and authorized CSV/Excel export.',
  },
  'audit-logs': {
    title: 'Immutable Audit Trail',
    phase: 'Phase 1 Backend / Phase 2 Web UI',
    srsIds: 'FR-AUD-001 through FR-AUD-007, Rule 7',
    description:
      'Cryptographically ordered audit event search and inspection without secret disclosure.',
  },
  settings: {
    title: 'Platform Security Settings',
    phase: 'Phase 6 (Hardening & Lockdown)',
    srsIds: 'FR-CONF-001, FR-CONF-002, FR-LAB-003',
    description:
      'Approved client version thresholds, lockdown policies, and global system configuration.',
  },
};

export const TabPlaceholder: React.FC<TabPlaceholderProps> = ({ tab, onReturnToDashboard }) => {
  const details = TAB_DETAILS[tab] || TAB_DETAILS.dashboard;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{details.title}</h3>
          <p className="text-xs text-slate-500 font-medium">Roadmap: {details.phase}</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 max-w-xl leading-relaxed">{details.description}</p>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
        <span className="font-semibold text-slate-700">Authoritative SRS Traceability:</span>
        <p className="font-mono text-blue-700">{details.srsIds}</p>
      </div>

      <div>
        <button
          type="button"
          onClick={onReturnToDashboard}
          className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
