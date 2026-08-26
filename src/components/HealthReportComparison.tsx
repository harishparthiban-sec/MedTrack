import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart3,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { MedicalReport, HealthComparisonReport } from '../types';
import { computeHealthComparison } from '../services/aiHealthComparison';

interface HealthReportComparisonProps {
  reports: MedicalReport[];
  initialComparison: HealthComparisonReport | null;
}

export const HealthReportComparison: React.FC<HealthReportComparisonProps> = ({
  reports,
  initialComparison,
}) => {
  const [selectedPrevId, setSelectedPrevId] = useState<string>(reports[0]?.id || '');
  const [selectedCurrId, setSelectedCurrId] = useState<string>(reports[1]?.id || reports[0]?.id || '');
  const [selectedTrendTest, setSelectedTrendTest] = useState<string>('HbA1c (Glycated Hemoglobin)');

  const prevReport = reports.find((r) => r.id === selectedPrevId) || reports[0];
  const currReport = reports.find((r) => r.id === selectedCurrId) || reports[1] || reports[0];

  const comparison: HealthComparisonReport | null =
    prevReport && currReport && prevReport.id !== currReport.id
      ? computeHealthComparison(prevReport, currReport)
      : initialComparison;

  const trendData = reports.map((r) => {
    const testMatch = r.testResults.find((t) => t.testName === selectedTrendTest);
    return {
      date: r.reportDate,
      value: testMatch ? testMatch.value : null,
      unit: testMatch ? testMatch.unit : '',
    };
  });

  return (
    <div className="space-y-8 pb-16 pt-2 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Document Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold">Lab Report Health Progress & AI Comparison</h1>
          <p className="text-sm mt-1 font-medium">
            AI automatically compares lab biomarkers across consecutive health reports to track progress and flag areas needing attention.
          </p>
        </div>
      </div>

      {/* Report Selector Bar */}
      <div className="card-subtle rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3.5 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="w-full">
            <label className="text-[11px] font-extrabold uppercase tracking-wider block mb-1">
              Baseline Past Report
            </label>
            <select
              value={selectedPrevId}
              onChange={(e) => setSelectedPrevId(e.target.value)}
              className="rounded-xl px-4 py-2 text-xs font-bold outline-none w-full"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reportDate} ({r.filename})
                </option>
              ))}
            </select>
          </div>
        </div>

        <ArrowRight className="w-6 h-6 text-slate-400 hidden sm:block flex-shrink-0" />

        <div className="flex items-center space-x-3.5 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="w-full">
            <label className="text-[11px] font-extrabold uppercase tracking-wider block mb-1">
              Latest Follow-Up Report
            </label>
            <select
              value={selectedCurrId}
              onChange={(e) => setSelectedCurrId(e.target.value)}
              className="rounded-xl px-4 py-2 text-xs font-bold outline-none w-full"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reportDate} ({r.filename})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Overall Executive Summary Card */}
      {comparison && (
        <div className="rounded-3xl p-8 border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 space-y-3 shadow-md">
          <div className="flex items-center space-x-2.5 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>AI Executive Progression Analysis</span>
          </div>
          <p className="text-sm sm:text-base leading-relaxed font-medium">
            {comparison.overallSummary}
          </p>
        </div>
      )}

      {/* Biomarker Comparison Cards Grid */}
      {comparison && (
        <div className="space-y-6">
          <h2 className="text-xl font-extrabold">Biomarker Shifts ({comparison.items.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparison.items.map((item, idx) => {
              const isImproved = item.status === 'improved';
              const isWorsened = item.status === 'worsened';

              return (
                <div
                  key={idx}
                  className={`card-subtle rounded-3xl p-6 sm:p-7 border transition-all space-y-5 ${
                    isImproved
                      ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/10'
                      : isWorsened
                      ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/10'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-extrabold">{item.testName}</h3>
                      <p className="text-xs">Target Range: {item.referenceRange || 'Standard'}</p>
                    </div>

                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1.5 ${
                        isImproved
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : isWorsened
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-slate-100 dark:bg-emerald-900/30'
                      }`}
                    >
                      {isImproved && <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />}
                      {isWorsened && <AlertTriangle className="w-4 h-4 mr-1 text-rose-500" />}
                      <span>{isImproved ? '✓ Improved' : isWorsened ? '⚠ Needs Attention' : 'Stable'}</span>
                    </span>
                  </div>

                  {/* Values Delta Display */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30">
                    <div className="text-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold block">Previous</span>
                      <span className="text-xl font-bold">
                        {item.previousValue} <span className="text-xs">{item.unit}</span>
                      </span>
                    </div>

                    <ArrowRight className="w-5 h-5 text-slate-400" />

                    <div className="text-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold block">Current</span>
                      <span
                        className={`text-2xl font-extrabold ${
                          isImproved ? 'text-emerald-500' : isWorsened ? 'text-rose-500' : 'text-cyan-500'
                        }`}
                      >
                        {item.currentValue} <span className="text-xs">{item.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold block">Change</span>
                      <span
                        className={`text-xs font-extrabold ${
                          item.changePercentage > 0 ? 'text-amber-500' : 'text-emerald-500'
                        }`}
                      >
                        {item.changePercentage > 0 ? `+${item.changePercentage}%` : `${item.changePercentage}%`}
                      </span>
                    </div>
                  </div>

                  {/* AI Natural Language Explanation */}
                  <p className="text-xs leading-relaxed flex items-start space-x-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item.explanation}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Biomarker Multi-Point Trend Graph (Recharts) */}
      <div className="card-subtle rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Longitudinal Biomarker Trend Chart</h3>
              <p className="text-xs">Multi-date parameter trajectory across uploaded reports</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold">Select Parameter:</span>
            <select
              value={selectedTrendTest}
              onChange={(e) => setSelectedTrendTest(e.target.value)}
              className="rounded-xl px-4 py-2 text-xs font-bold outline-none"
            >
              <option value="HbA1c (Glycated Hemoglobin)">HbA1c (Glycated Hemoglobin)</option>
              <option value="Vitamin D (25-OH)">Vitamin D (25-OH)</option>
              <option value="LDL Cholesterol">LDL Cholesterol</option>
              <option value="Fasting Blood Sugar">Fasting Blood Sugar</option>
            </select>
          </div>
        </div>

        {/* Recharts Component */}
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="date" stroke="currentColor" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis stroke="currentColor" tick={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={selectedTrendTest}
                stroke="#059669"
                strokeWidth={4}
                dot={{ r: 7, fill: '#059669', strokeWidth: 2 }}
                activeDot={{ r: 9, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Informational Disclaimer Banner */}
      <div className="card-subtle rounded-2xl p-5 flex items-start space-x-3.5 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-amber-600 dark:text-amber-400">Medical Informational Disclaimer:</span> MedTrack AI health comparison insights are for personal informational tracking purposes only and do not replace professional medical diagnosis. Always discuss significant changes in your health reports with your doctor or healthcare provider.
        </div>
      </div>

    </div>
  );
};
