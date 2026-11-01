/**
 * VeriSync Question-Level Performance Statistics & Distribution Charts
 * Displays difficulty, discrimination index, correct-answer rate, and option response distribution.
 * Traceability: FR-ADMIN-006, FR-ADMIN-007
 */

import React from 'react';
import { CheckCircle2, HelpCircle, FileCode, Database, FileText, Activity } from 'lucide-react';
import { QuestionPerformanceStats } from '../../types/api';

interface QuestionStatsChartsProps {
  stats: QuestionPerformanceStats[];
  isLoading?: boolean;
}

export const QuestionStatsCharts: React.FC<QuestionStatsChartsProps> = ({
  stats,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const getDifficultyBadge = (diff: 'EASY' | 'MEDIUM' | 'HARD') => {
    switch (diff) {
      case 'EASY':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            EASY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            MEDIUM
          </span>
        );
      case 'HARD':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            HARD
          </span>
        );
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'CODING':
        return <FileCode className="w-3.5 h-3.5 text-purple-600" />;
      case 'SQL':
        return <Database className="w-3.5 h-3.5 text-emerald-600" />;
      case 'DESCRIPTIVE':
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Question-Level Performance Analytics (FR-ADMIN-006)
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Response distribution, accuracy rates, and item discrimination indices
          </p>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {stats.length} Questions Evaluated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((q) => {
          const isHighAccuracy = q.correctAnswerRate >= 70;
          const isLowAccuracy = q.correctAnswerRate < 50;

          return (
            <div
              key={q.questionId}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {getQuestionTypeIcon(q.type)}
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      {q.type}
                    </span>
                    {getDifficultyBadge(q.difficultyIndex)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1" title={q.title}>
                    {q.title}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    Avg: {q.averageScore} / {q.maxScore} pts
                  </span>
                </div>
              </div>

              {/* Accuracy Rate Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Correct-Answer Rate</span>
                  <span
                    className={`font-bold font-mono ${
                      isHighAccuracy
                        ? 'text-emerald-600'
                        : isLowAccuracy
                          ? 'text-rose-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {q.correctAnswerRate}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHighAccuracy
                        ? 'bg-emerald-500'
                        : isLowAccuracy
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                    }`}
                    style={{ width: `${q.correctAnswerRate}%` }}
                  />
                </div>
              </div>

              {/* Discrimination Index & Metrics */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-500" />
                  <span>Discrimination Index:</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{q.discriminationIndex}</span>
              </div>

              {/* Response Distribution for MCQs */}
              {q.responseDistribution && q.responseDistribution.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Option Response Distribution
                  </span>
                  <div className="space-y-1.5">
                    {q.responseDistribution.map((opt) => (
                      <div key={opt.optionKey} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              opt.isCorrect ? 'text-emerald-700 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            <span className="font-mono font-bold">{opt.optionKey}.</span>
                            <span className="truncate max-w-[200px]">{opt.optionLabel}</span>
                            {opt.isCorrect && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            )}
                          </span>
                          <span className="font-mono text-slate-400">
                            {opt.percentage}% ({opt.count})
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${opt.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
