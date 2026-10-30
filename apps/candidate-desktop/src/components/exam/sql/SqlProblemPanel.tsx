/**
 * SQL Problem Panel Component
 * Traceability: FR-SQL-001, FR-SQL-002, UC-11
 * Displays SQL Question statement, Schema DDL, Seed Data, and Expected Format.
 */

import React, { useState } from 'react';
import { SqlQuestionDetails } from '../../../types/codeRunner';
import { Database, Table, HelpCircle } from 'lucide-react';

interface SqlProblemPanelProps {
  details: SqlQuestionDetails;
  title?: string;
  maxMarks?: number;
}

export const SqlProblemPanel: React.FC<SqlProblemPanelProps> = ({
  details,
  title = 'SQL Query Challenge',
  maxMarks = 15,
}) => {
  const [activeTab, setActiveTab] = useState<'statement' | 'schema'>('statement');

  return (
    <div
      role="region"
      aria-label="SQL Problem Panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f8fafc' }}>{title}</h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
            <span>Max Score: <strong style={{ color: '#38bdf8' }}>{maxMarks} pts</strong></span>
            <span>Database: <strong>SQLite Ephemeral</strong></span>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', backgroundColor: '#0f172a', borderRadius: 6, padding: 3, gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            aria-pressed={activeTab === 'statement'}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'statement' ? '#2563eb' : 'transparent',
              color: activeTab === 'statement' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <HelpCircle size={13} />
            <span>Problem</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            aria-pressed={activeTab === 'schema'}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              backgroundColor: activeTab === 'schema' ? '#2563eb' : 'transparent',
              color: activeTab === 'schema' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Database size={13} />
            <span>Schema DDL</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'statement' ? (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>
                Instructions
              </h3>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {details.statement}
              </div>
            </div>

            {/* Quick Schema Summary Preview */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Table size={14} />
                <span>Table Definition</span>
              </h4>
              <pre
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  backgroundColor: '#030712',
                  borderRadius: 6,
                  border: '1px solid #1f2937',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: '#93c5fd',
                  overflowX: 'auto',
                }}
              >
                {details.schemaDdl}
              </pre>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>
                Database DDL & Constraints
              </h3>
              <pre
                style={{
                  margin: 0,
                  padding: '14px',
                  backgroundColor: '#030712',
                  borderRadius: 6,
                  border: '1px solid #1f2937',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: '#93c5fd',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {details.schemaDdl}
              </pre>
            </div>

            {details.seedDataSql && (
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: 6 }}>
                  Seed Data Sample
                </h4>
                <pre
                  style={{
                    margin: 0,
                    padding: '12px 14px',
                    backgroundColor: '#030712',
                    borderRadius: 6,
                    border: '1px solid #1f2937',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#c4b5fd',
                    overflowX: 'auto',
                  }}
                >
                  {details.seedDataSql}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

