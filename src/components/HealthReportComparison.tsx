import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  ArrowLeftRight,
  Upload,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { MedicalReport, HealthComparisonReport } from '../types';
import { computeHealthComparison, findMatch } from '../services/aiHealthComparison';

interface HealthReportComparisonProps {
  reports: MedicalReport[];
  initialComparison: HealthComparisonReport | null;
  setActiveTab?: (tab: string) => void;
}

export const HealthReportComparison: React.FC<HealthReportComparisonProps> = ({
  reports,
  initialComparison,
  setActiveTab,
}) => {
  // Sort reports chronologically: oldest first (Baseline), newest last (Follow-up)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => (a.reportDate || '').localeCompare(b.reportDate || ''));
  }, [reports]);

  const defaultCurrId = sortedReports.length >= 1 ? sortedReports[sortedReports.length - 1].id : '';

  // Smart baseline: pick the preceding report that shares matching biomarkers with the latest report
  const defaultPrevId = useMemo(() => {
    if (sortedReports.length < 2) return reports[0]?.id || '';
    const latest = sortedReports[sortedReports.length - 1];

    for (let i = sortedReports.length - 2; i >= 0; i--) {
      const candidate = sortedReports[i];
      const hasMatch = candidate.testResults.some((t) =>
        findMatch(t.testName, latest.testResults, new Set())
      );
      if (hasMatch) return candidate.id;
    }

    return sortedReports[0].id;
  }, [sortedReports, reports]);

  const [selectedPrevId, setSelectedPrevId] = useState<string>(defaultPrevId);
  const [selectedCurrId, setSelectedCurrId] = useState<string>(defaultCurrId);

  // Keep selections synced when reports are uploaded or deleted
  useEffect(() => {
    if (sortedReports.length >= 2) {
      if (!selectedPrevId || !reports.some((r) => r.id === selectedPrevId)) {
        setSelectedPrevId(defaultPrevId);
      }
      if (!selectedCurrId || !reports.some((r) => r.id === selectedCurrId)) {
        setSelectedCurrId(sortedReports[sortedReports.length - 1].id);
      }
    }
  }, [reports, sortedReports, selectedPrevId, selectedCurrId, defaultPrevId]);

  const prevReport = reports.find((r) => r.id === selectedPrevId) || sortedReports[0];
  const currReport = reports.find((r) => r.id === selectedCurrId) || sortedReports[sortedReports.length - 1];

  const comparison: HealthComparisonReport | null = useMemo(() => {
    if (prevReport && currReport && prevReport.id !== currReport.id) {
      return computeHealthComparison(prevReport, currReport);
    }
    if (reports.length >= 2) return initialComparison;
    return null;
  }, [prevReport, currReport, initialComparison, reports.length]);

  // Find another report that shares biomarkers with currReport when currently selected prevReport has 0 matches
  const suggestedMatchingReport = useMemo(() => {
    if (!currReport || !prevReport || (comparison && comparison.items.length > 0)) return null;

    for (const r of sortedReports) {
      if (r.id === currReport.id || r.id === prevReport.id) continue;
      const matched = r.testResults.filter((t) =>
        findMatch(t.testName, currReport.testResults, new Set())
      );
      if (matched.length > 0) {
        return {
          id: r.id,
          reportDate: r.reportDate,
          labName: r.labName,
          filename: r.filename,
          matchCount: matched.length,
          matchedNames: matched.map((m) => m.testName),
        };
      }
    }
    return null;
  }, [currReport, prevReport, comparison, sortedReports]);

  // Dynamic test name list from all reports
  const allTestNames = useMemo(() => {
    const namesSet = new Set<string>();
    reports.forEach((r) => r.testResults.forEach((t) => namesSet.add(t.testName)));
    return Array.from(namesSet).sort();
  }, [reports]);

  const [selectedTrendTest, setSelectedTrendTest] = useState<string>(allTestNames[0] || '');

  // Trend data sorted chronologically
  const trendData = useMemo(() => {
    return [...reports]
      .sort((a, b) => (a.reportDate < b.reportDate ? -1 : 1))
      .map((r) => {
        const dummySet = new Set<string>();
        const testMatch = findMatch(selectedTrendTest, r.testResults, dummySet);
        return {
          date: r.reportDate,
          value: testMatch ? testMatch.value : null,
          unit: testMatch ? testMatch.unit : '',
        };
      })
      .filter((d) => d.value !== null);
  }, [reports, selectedTrendTest]);

  // Handle swap reports
  const handleSwapReports = () => {
    setSelectedPrevId(selectedCurrId);
    setSelectedCurrId(selectedPrevId);
  };

  // --- Empty State ---
  if (reports.length < 2) {
    return (
      <div className="space-y-8 pb-16 pt-2 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>AI Document Intelligence</span>
            </div>
            <h1 className="text-3xl font-extrabold">Lab Report Health Progress &amp; AI Comparison</h1>
            <p className="text-sm mt-1 font-medium">
              AI automatically compares lab biomarkers across consecutive health reports to track progress and flag areas needing attention.
            </p>
          </div>
        </div>

        <div className="card-subtle rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 border-2 border-dashed border-emerald-500/30">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-emerald-500/60" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-extrabold">
              {reports.length === 0 ? 'No Reports Uploaded Yet' : 'Upload a Second Report to Compare'}
            </h2>
            <p className="text-sm font-medium leading-relaxed opacity-70">
              {reports.length === 0
                ? 'Upload at least two blood/lab reports from the Upload Center to unlock AI-powered biomarker comparison and trend analysis.'
                : 'You have 1 report uploaded. Upload one more lab report to enable AI comparison between your baseline and follow-up values.'}
            </p>
          </div>
          <div className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">
            <Upload className="w-4 h-4" />
            <span>Go to Upload Center → Lab Reports</span>
          </div>
        </div>

        <div className="card-subtle rounded-2xl p-5 flex items-start space-x-3.5 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-600 dark:text-amber-400">Medical Informational Disclaimer:</span> MedTrack AI health comparison insights are for personal informational tracking purposes only and do not replace professional medical diagnosis.
          </div>
        </div>
      </div>
    );
  }

  // --- Main Comparison View ---
  return (
    <div className="space-y-8 pb-16 pt-2 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Document Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold">Lab Report Health Progress &amp; AI Comparison</h1>
          <p className="text-sm mt-1 font-medium">
            AI automatically compares lab biomarkers across consecutive health reports to track progress and flag areas needing attention.
          </p>
        </div>
        <div className="flex-shrink-0 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>{reports.length} Reports Available</span>
        </div>
      </div>

      {/* Report Selector Bar */}
      <div className="card-subtle rounded-3xl p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">

        {/* Baseline */}
        <div className="flex items-center space-x-3.5 w-full sm:flex-1">
          <div className="w-10 h-10 rounded-2xl bg-slate-500/15 border border-slate-500/30 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="w-full min-w-0">
            <label className="text-[11px] font-extrabold uppercase tracking-wider block mb-1.5 opacity-60">
              📅 Baseline (Past) Report
            </label>
            <select
              value={selectedPrevId}
              onChange={(e) => setSelectedPrevId(e.target.value)}
              style={{ backgroundColor: '#07281f', color: '#f8fafc', border: '1.5px solid rgba(52,211,153,0.35)' }}
              className="rounded-xl px-3 py-2.5 text-xs font-bold outline-none w-full cursor-pointer"
            >
              {sortedReports.map((r) => {
                const sampleTests = r.testResults.slice(0, 3).map((t) => t.testName).join(', ');
                const moreCount = r.testResults.length > 3 ? ` +${r.testResults.length - 3}` : '';
                const testLabel = r.testResults.length === 0 ? '0 tests' : `${r.testResults.length} test${r.testResults.length !== 1 ? 's' : ''}: ${sampleTests}${moreCount}`;
                return (
                  <option key={r.id} value={r.id} style={{ backgroundColor: '#07281f', color: '#f8fafc' }}>
                    {r.reportDate}  •  {r.labName}  •  ({testLabel})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Interactive Swap Button */}
        <div className="flex sm:flex-col items-center justify-center flex-shrink-0 px-2 my-auto">
          <button
            type="button"
            onClick={handleSwapReports}
            title="Swap Baseline and Follow-Up reports"
            className="px-3 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider">Swap</span>
          </button>
        </div>

        {/* Latest */}
        <div className="flex items-center space-x-3.5 w-full sm:flex-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="w-full min-w-0">
            <label className="text-[11px] font-extrabold uppercase tracking-wider block mb-1.5 text-emerald-600 dark:text-emerald-400">
              🔬 Latest (Follow-Up) Report
            </label>
            <select
              value={selectedCurrId}
              onChange={(e) => setSelectedCurrId(e.target.value)}
              style={{ backgroundColor: '#07281f', color: '#f8fafc', border: '1.5px solid rgba(52,211,153,0.55)' }}
              className="rounded-xl px-3 py-2.5 text-xs font-bold outline-none w-full cursor-pointer"
            >
              {sortedReports.map((r) => {
                const sampleTests = r.testResults.slice(0, 3).map((t) => t.testName).join(', ');
                const moreCount = r.testResults.length > 3 ? ` +${r.testResults.length - 3}` : '';
                const testLabel = r.testResults.length === 0 ? '0 tests' : `${r.testResults.length} test${r.testResults.length !== 1 ? 's' : ''}: ${sampleTests}${moreCount}`;
                return (
                  <option key={r.id} value={r.id} style={{ backgroundColor: '#07281f', color: '#f8fafc' }}>
                    {r.reportDate}  •  {r.labName}  •  ({testLabel})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Out of chronological order banner */}
      {prevReport && currReport && prevReport.id !== currReport.id && prevReport.reportDate > currReport.reportDate && (
        <div className="rounded-2xl p-4 flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-cyan-400" />
            <span>Note: Baseline ({prevReport.reportDate}) is dated after Follow-Up ({currReport.reportDate}). Swap reports to show chronological health progression over time.</span>
          </div>
          <button
            type="button"
            onClick={handleSwapReports}
            className="ml-3 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-700 dark:text-cyan-200 text-xs font-extrabold flex-shrink-0 cursor-pointer"
          >
            Swap Order
          </button>
        </div>
      )}

      {/* Same-report warning */}
      {selectedPrevId === selectedCurrId && (
        <div className="rounded-2xl p-4 flex items-center space-x-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Please select two <strong>different</strong> reports to compare biomarker changes.</span>
        </div>
      )}

      {/* AI Executive Summary */}
      {comparison && selectedPrevId !== selectedCurrId && (
        <div className="rounded-3xl p-7 border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 space-y-4 shadow-md">
          <div className="flex items-center space-x-2.5 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>AI Executive Progression Analysis</span>
          </div>
          <p className="text-sm sm:text-base leading-relaxed font-medium">
            {comparison.overallSummary}
          </p>
          {comparison.items.length > 0 ? (
            <div className="flex flex-wrap gap-3 pt-1">
              <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{comparison.items.filter((i) => i.status === 'improved').length} Improved</span>
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{comparison.items.filter((i) => i.status === 'worsened').length} Need Attention</span>
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                <Minus className="w-3.5 h-3.5" />
                <span>{comparison.items.filter((i) => i.status === 'stable').length} Stable</span>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>0 Overlapping Biomarkers Between Selected Dates</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Baseline has {prevReport?.testResults.length || 0} test(s), Follow-up has {currReport?.testResults.length || 0} test(s).
              </span>
            </div>
          )}
        </div>
      )}

      {/* Diagnostic Panel when 0 matching biomarkers */}
      {comparison && selectedPrevId !== selectedCurrId && comparison.items.length === 0 && (
        <div className="card-subtle rounded-3xl p-6 sm:p-8 border border-amber-500/30 space-y-5 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Biomarker Mismatch Diagnostics
              </h3>
              <p className="text-xs text-slate-500 dark:text-emerald-200/70 font-medium mt-0.5">
                The AI examined all analytes in both reports. The two selected documents test different medical parameters:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Report Biomarkers */}
            <div className="rounded-2xl p-4 bg-slate-500/10 border border-slate-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>📅 Baseline ({prevReport?.reportDate}):</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-[11px] font-bold">
                  {prevReport?.testResults.length || 0} Biomarkers
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {prevReport && prevReport.testResults.length > 0 ? (
                  prevReport.testResults.map((t, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700">
                      {t.testName} <span className="opacity-70 font-medium">({t.value} {t.unit})</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-slate-400">No test results in this report</span>
                )}
              </div>
            </div>

            {/* Follow-up Report Biomarkers */}
            <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>🔬 Follow-up ({currReport?.reportDate}):</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[11px] font-bold">
                  {currReport?.testResults.length || 0} Biomarkers
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currReport && currReport.testResults.length > 0 ? (
                  currReport.testResults.map((t, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {t.testName} <span className="opacity-70 font-medium">({t.value} {t.unit})</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-slate-400">No test results in this report</span>
                )}
              </div>
            </div>
          </div>

          {/* Smart suggestion button */}
          {suggestedMatchingReport && (
            <div className="rounded-2xl p-4 bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 text-xs text-cyan-800 dark:text-cyan-200">
                <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                <span>
                  <strong>Matching Report Detected:</strong> Your report from <strong>{suggestedMatchingReport.reportDate}</strong> ({suggestedMatchingReport.labName}) has {suggestedMatchingReport.matchCount} matching biomarker{suggestedMatchingReport.matchCount !== 1 ? 's' : ''} ({suggestedMatchingReport.matchedNames.join(', ')})!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrevId(suggestedMatchingReport.id)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black hover:bg-cyan-400 transition-all flex-shrink-0 shadow-sm cursor-pointer"
              >
                Compare with {suggestedMatchingReport.reportDate} Report →
              </button>
            </div>
          )}

          {/* Action to view / add biomarkers in Reports History */}
          {setActiveTab && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View, add, or edit biomarkers in Reports History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Biomarker Comparison Cards */}
      {comparison && selectedPrevId !== selectedCurrId && comparison.items.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-extrabold">Biomarker Shifts ({comparison.items.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {comparison.items.map((item, idx) => {
              const isImproved = item.status === 'improved';
              const isWorsened = item.status === 'worsened';
              return (
                <div
                  key={idx}
                  className={`card-subtle rounded-3xl p-6 sm:p-7 border transition-all space-y-4 ${
                    isImproved
                      ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/10'
                      : isWorsened
                      ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-emerald-900/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 min-w-0 pr-3">
                      <h3 className="text-base font-extrabold leading-tight">{item.testName}</h3>
                      <p className="text-xs opacity-60">Reference: {item.referenceRange || 'Standard'}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1 ${
                        isImproved
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : isWorsened
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-slate-100 dark:bg-emerald-900/30 border border-slate-200 dark:border-emerald-800/50'
                      }`}
                    >
                      {isImproved && <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" />}
                      {isWorsened && <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-500" />}
                      {!isImproved && !isWorsened && <Minus className="w-3.5 h-3.5 mr-1" />}
                      <span>{isImproved ? 'Improved' : isWorsened ? 'Attention' : 'Stable'}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30">
                    <div className="text-center flex-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1">Previous</span>
                      <span className="text-xl font-bold">
                        {item.previousValue}
                        <span className="text-xs font-medium ml-1 opacity-70">{item.unit}</span>
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="text-center flex-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1">Current</span>
                      <span className={`text-2xl font-extrabold ${isImproved ? 'text-emerald-500' : isWorsened ? 'text-rose-500' : 'text-cyan-500'}`}>
                        {item.currentValue}
                        <span className="text-xs font-medium ml-1 opacity-70">{item.unit}</span>
                      </span>
                    </div>
                    <div className="text-center flex-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1">Δ Change</span>
                      <span className={`text-sm font-extrabold ${isImproved ? 'text-emerald-500' : isWorsened ? 'text-rose-500' : 'text-slate-400'}`}>
                        {item.changePercentage > 0 ? `+${item.changePercentage}%` : `${item.changePercentage}%`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed flex items-start space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="opacity-80">{item.explanation}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Longitudinal Trend Chart */}
      <div className="card-subtle rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Longitudinal Biomarker Trend Chart</h3>
              <p className="text-xs opacity-60">Multi-date parameter trajectory across all uploaded reports</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <span className="text-xs font-extrabold opacity-70 whitespace-nowrap">Select Parameter:</span>
            <select
              value={selectedTrendTest}
              onChange={(e) => setSelectedTrendTest(e.target.value)}
              style={{ backgroundColor: '#07281f', color: '#f8fafc', border: '1.5px solid rgba(52,211,153,0.35)' }}
              className="rounded-xl px-3 py-2 text-xs font-bold outline-none min-w-[180px] cursor-pointer"
            >
              {allTestNames.map((name) => (
                <option key={name} value={name} style={{ backgroundColor: '#07281f', color: '#f8fafc' }}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {trendData.every((d) => d.value === null) ? (
            <div className="h-full flex items-center justify-center text-sm opacity-50 font-medium">
              No data found for "{selectedTrendTest}" across uploaded reports.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" stroke="currentColor" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                <YAxis stroke="currentColor" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} width={48} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    backgroundColor: '#07281f',
                    border: '1px solid rgba(52,211,153,0.3)',
                    color: '#f8fafc',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  labelStyle={{ color: '#a7f3d0', marginBottom: '4px' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value ?? ''} ${trendData[0]?.unit || ''}`, selectedTrendTest] as [string, string]}
                />
                <ReferenceLine y={0} stroke="rgba(52,211,153,0.15)" />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedTrendTest}
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#10b981' }}
                  activeDot={{ r: 9, fill: '#10b981', stroke: '#34d399', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card-subtle rounded-2xl p-5 flex items-start space-x-3.5 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-amber-600 dark:text-amber-400">Medical Informational Disclaimer:</span> MedTrack AI health comparison insights are for personal informational tracking purposes only and do not replace professional medical diagnosis. Always discuss significant changes in your health reports with your doctor or healthcare provider.
        </div>
      </div>

    </div>
  );
};
