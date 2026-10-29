import React, { useEffect, useState } from 'react';
import {
  FileText,
  Clock,
  Award,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { CandidateAssignedAssessment } from '../types/assessment';
import { apiClient } from '../services/apiClient';
import { MockUser } from '../services/mockApi';
import { handleApiError, UserFacingError } from '../services/errorHandler';

/**
 * Assigned Assessments Screen
 * Source of truth: docs/SRS/srs.md (FR-UI-001, UC-08, BR-002, BR-007)
 * TC09 Guarantee: Zero answer keys, hidden test cases, or expected outputs rendered.
 */

interface AssignedAssessmentsScreenProps {
  user: MockUser | null;
  onSelectAssessment: (assessment: CandidateAssignedAssessment) => void;
  onLogout: () => void;
}

export const AssignedAssessmentsScreen: React.FC<AssignedAssessmentsScreenProps> = ({
  user,
  onSelectAssessment,
  onLogout,
}) => {
  const [assessments, setAssessments] = useState<CandidateAssignedAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<UserFacingError | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAssignedAssessments();
      setAssessments(data);
    } catch (err) {
      const mapped = handleApiError(err);
      setError(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAssessments();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          height: 64,
          borderBottom: '1px solid #1f2937',
          backgroundColor: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={18} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              VeriSync Candidate Portal
            </h1>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              Candidate ID: <strong style={{ color: '#93c5fd' }}>{user?.candidateId || 'CND12345'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => void fetchAssessments()}
            disabled={loading}
            title="Refresh Assessments"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#cbd5e1',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onLogout}
            title="Sign Out"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1000, width: '100%', margin: '0 auto', padding: '36px 20px' }}>
        {/* Title & Description */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc' }}>
            Assigned Assessments
          </h2>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
            Below are the assessments registered to your candidate profile. Select an eligible assessment to view its instructions and begin.
          </p>
        </div>

        {/* Error Callout */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 16,
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              marginBottom: 24,
            }}
          >
            <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>
                {error.title}
              </div>
              <div style={{ fontSize: 13, color: '#fca5a5' }}>
                {error.message} {error.actionHint && `— ${error.actionHint}`}
              </div>
              {error.correlationId && (
                <div style={{ fontSize: 11, color: '#f87171', marginTop: 4, fontFamily: 'monospace' }}>
                  Correlation ID: {error.correlationId}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  backgroundColor: '#111827',
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && assessments.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#111827',
              borderRadius: 12,
              border: '1px solid #1f2937',
            }}
          >
            <HelpCircle size={40} color="#6b7280" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px 0', color: '#e5e7eb' }}>
              No Assessments Assigned
            </h3>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
              There are currently no active or scheduled assessments mapped to your candidate account.
            </p>
          </div>
        )}

        {/* Assessments List */}
        {!loading && assessments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {assessments.map((asmt) => {
              const eligible = asmt.isEligible;
              return (
                <div
                  key={asmt.assignmentId}
                  style={{
                    backgroundColor: '#111827',
                    borderRadius: 12,
                    border: eligible ? '1px solid #374151' : '1px solid #1f2937',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: eligible ? '0 8px 24px -10px rgba(0, 0, 0, 0.4)' : 'none',
                    opacity: eligible ? 1 : 0.85,
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                          {asmt.title}
                        </h3>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: '#1f2937',
                            color: '#93c5fd',
                            border: '1px solid #374151',
                          }}
                        >
                          {asmt.roleCategory}
                        </span>
                      </div>
                      {asmt.description && (
                        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, maxWidth: 650 }}>
                          {asmt.description}
                        </p>
                      )}
                    </div>

                    {/* Eligibility Badge */}
                    <div>
                      {eligible ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 20,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Eligible to Start</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 20,
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <XCircle size={14} />
                          <span>{asmt.eligibilityReason || 'Ineligible'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                      padding: 14,
                      backgroundColor: '#182234',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color="#93c5fd" />
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Duration</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                          {asmt.overallDuration} Minutes
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={16} color="#fbbf24" />
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Total Marks</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                          {asmt.totalMarks !== null ? `${asmt.totalMarks} Marks` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} color="#34d399" />
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Window Closes</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                          {formatDate(asmt.endAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} color="#a78bfa" />
                      <div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Attempts Remaining</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                          {asmt.attemptsRemaining} of {asmt.attemptLimit} left
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                    <button
                      onClick={() => onSelectAssessment(asmt)}
                      disabled={!eligible}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        borderRadius: 8,
                        backgroundColor: eligible ? '#2563eb' : '#374151',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: eligible ? 'pointer' : 'not-allowed',
                        opacity: eligible ? 1 : 0.6,
                        boxShadow: eligible ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{eligible ? 'View Instructions & Start' : 'Not Available'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

