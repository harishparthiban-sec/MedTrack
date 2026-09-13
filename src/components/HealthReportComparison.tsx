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

  const improvedItems = useMemo(() => {
    if (!comparison) return [];
    return comparison.items.filter((i) => i.status === 'improved');
  }, [comparison]);

  const degradedItems = useMemo(() => {
    if (!comparison) return [];
    return comparison.items.filter((i) => i.status === 'worsened');
  }, [comparison]);

  // ONLY biomarkers that are improved or degraded - strictly exclude unnecessary biomarkers!
  const trendTestItems = useMemo(() => {
    return [...improvedItems, ...degradedItems];
  }, [improvedItems, degradedItems]);

  const [selectedTrendTest, setSelectedTrendTest] = useState<string>('');

  // Keep selected trend test aligned with improved/degraded list
  useEffect(() => {
    if (trendTestItems.length > 0) {
      if (!selectedTrendTest || !trendTestItems.some((t) => t.testName === selectedTrendTest)) {
        setSelectedTrendTest(trendTestItems[0].testName);
      }
    } else {
      setSelectedTrendTest('');
    }
  }, [trendTestItems, selectedTrendTest]);

  const currentTrendItem = trendTestItems.find((t) => t.testName === selectedTrendTest);
  const isCurrentTrendImproved = currentTrendItem?.status === 'improved';

  // Trend data for the selected improved/degraded parameter
  const trendData = useMemo(() => {
    if (!selectedTrendTest) return [];
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
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('upload')}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-extrabold cursor-pointer transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Go to Upload Center → Lab Reports</span>
          </button>
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
          <div className="flex flex-wrap gap-3 pt-1">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{improvedItems.length} Improved</span>
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{degradedItems.length} Degraded</span>
            </span>
          </div>
        </div>
      )}

      {/* Improved Biomarkers Section Alone */}
      {comparison && selectedPrevId !== selectedCurrId && improvedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5 text-emerald-600 dark:text-emerald-400">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold">Improved Biomarkers ({improvedItems.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {improvedItems.map((item, idx) => (
              <div
                key={idx}
                className="card-subtle rounded-3xl p-6 sm:p-7 border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/15 transition-all space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1 min-w-0 pr-3">
                    <h3 className="text-base font-extrabold leading-tight text-slate-900 dark:text-white">
                      {item.testName}
                    </h3>
                    <p className="text-xs opacity-60">Reference: {item.referenceRange || 'Standard'}</p>
                  </div>
                  <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    <span>Improved</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-white/60 dark:bg-[#031f17] border border-emerald-500/20">
                  <div className="text-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1">Previous</span>
                    <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                      {item.previousValue}
                      <span className="text-xs font-medium ml-1 opacity-70">{item.unit}</span>
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-500/60 flex-shrink-0" />
                  <div className="text-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1 text-emerald-600 dark:text-emerald-400">Current</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {item.currentValue}
                      <span className="text-xs font-bold ml-1 opacity-80">{item.unit}</span>
                    </span>
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1 text-emerald-600 dark:text-emerald-400">Change</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {item.changePercentage > 0 ? `+${item.changePercentage}%` : `${item.changePercentage}%`}
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed flex items-start space-x-2 text-slate-700 dark:text-emerald-200/90 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item.explanation}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Degraded Biomarkers Section Alone */}
      {comparison && selectedPrevId !== selectedCurrId && degradedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5 text-rose-600 dark:text-rose-400">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold">Degraded Biomarkers ({degradedItems.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {degradedItems.map((item, idx) => (
              <div
                key={idx}
                className="card-subtle rounded-3xl p-6 sm:p-7 border border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/15 transition-all space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1 min-w-0 pr-3">
                    <h3 className="text-base font-extrabold leading-tight text-slate-900 dark:text-white">
                      {item.testName}
                    </h3>
                    <p className="text-xs opacity-60">Reference: {item.referenceRange || 'Standard'}</p>
                  </div>
                  <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    <span>Degraded</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-4 rounded-2xl bg-white/60 dark:bg-[#031f17] border border-rose-500/20">
                  <div className="text-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1">Previous</span>
                    <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                      {item.previousValue}
                      <span className="text-xs font-medium ml-1 opacity-70">{item.unit}</span>
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-rose-500/60 flex-shrink-0" />
                  <div className="text-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1 text-rose-600 dark:text-rose-400">Current</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {item.currentValue}
                      <span className="text-xs font-bold ml-1 opacity-80">{item.unit}</span>
                    </span>
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold block opacity-60 mb-1 text-rose-600 dark:text-rose-400">Change</span>
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      {item.changePercentage > 0 ? `+${item.changePercentage}%` : `${item.changePercentage}%`}
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed flex items-start space-x-2 text-slate-700 dark:text-rose-200/90 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{item.explanation}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* When no improved or degraded biomarkers */}
      {comparison && selectedPrevId !== selectedCurrId && improvedItems.length === 0 && degradedItems.length === 0 && (
        <div className="card-subtle rounded-3xl p-8 text-center space-y-3 border border-slate-200 dark:border-emerald-900/30">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {comparison.items.length === 0
              ? '⚠ No matching biomarkers found between these two reports.'
              : `✓ ${comparison.items.length} biomarker(s) matched — all values appear stable between these reports.`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {comparison.items.length === 0
              ? 'The two selected reports may contain different test panels, or the biomarker names may not overlap. Try re-uploading the reports to improve detection accuracy.'
              : 'No significant improvements or degradations were detected. All compared biomarkers changed within the stable threshold range.'}
          </p>
          {comparison.items.length === 0 && (
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('upload')}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold transition-all cursor-pointer"
            >
              Re-upload Reports →
            </button>
          )}
        </div>
      )}

      {/* Longitudinal Trend Chart — ONLY Improved & Degraded Biomarkers */}
      <div className="card-subtle rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isCurrentTrendImproved
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : trendTestItems.length > 0
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-slate-500/15 border-slate-500/30 text-slate-400'
            }`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Biomarker Progression Graph</h3>
              <p className="text-xs opacity-60">Plotting improved and degraded biomarkers across reports</p>
            </div>
          </div>

          {trendTestItems.length > 0 && (
            <div className="flex items-center space-x-3 flex-shrink-0">
              <span className="text-xs font-extrabold opacity-70 whitespace-nowrap">Select Parameter:</span>
              <select
                value={selectedTrendTest}
                onChange={(e) => setSelectedTrendTest(e.target.value)}
                style={{ backgroundColor: '#07281f', color: '#f8fafc', border: '1.5px solid rgba(52,211,153,0.35)' }}
                className="rounded-xl px-3 py-2 text-xs font-bold outline-none min-w-[220px] cursor-pointer"
              >
                {trendTestItems.map((item) => (
                  <option key={item.testName} value={item.testName} style={{ backgroundColor: '#07281f', color: '#f8fafc' }}>
                    {item.status === 'improved' ? '✓ ' : '⚠ '} {item.testName} ({item.status === 'improved' ? 'Improved' : 'Degraded'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="h-72 w-full pt-2">
          {trendTestItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm opacity-50 font-medium">
              No improved or degraded biomarkers to display in graph.
            </div>
          ) : trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm opacity-50 font-medium">
              No data points found for "{selectedTrendTest}".
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
                    border: `1px solid ${isCurrentTrendImproved ? 'rgba(52,211,153,0.4)' : 'rgba(244,63,94,0.4)'}`,
                    color: '#f8fafc',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  labelStyle={{ color: isCurrentTrendImproved ? '#a7f3d0' : '#fecdd3', marginBottom: '4px' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [
                    `${value ?? ''} ${trendData[0]?.unit || ''} (${isCurrentTrendImproved ? 'Improved' : 'Degraded'})`,
                    selectedTrendTest
                  ] as [string, string]}
                />
                <ReferenceLine y={0} stroke="rgba(52,211,153,0.15)" />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedTrendTest}
                  stroke={isCurrentTrendImproved ? '#10b981' : '#f43f5e'}
                  strokeWidth={3}
                  dot={{ r: 6, fill: isCurrentTrendImproved ? '#10b981' : '#f43f5e', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 9, fill: isCurrentTrendImproved ? '#34d399' : '#fb7185', strokeWidth: 2 }}
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
