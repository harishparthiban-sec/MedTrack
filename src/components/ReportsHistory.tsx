import React, { useState } from 'react';
import {
  FileText,
  User,
  Eye,
  Trash2,
  Search,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  ArrowRight,
  Plus,
  BarChart3,
  Building,
} from 'lucide-react';
import type { Prescription, MedicalReport } from '../types';

interface ReportsHistoryProps {
  prescriptions: Prescription[];
  reports: MedicalReport[];
  onDeletePrescription: (id: string) => void;
  onDeleteReport: (id: string) => void;
  setActiveTab?: (tab: string) => void;
}

export const ReportsHistory: React.FC<ReportsHistoryProps> = ({
  prescriptions,
  reports,
  onDeletePrescription,
  onDeleteReport,
  setActiveTab,
}) => {
  const [activeSection, setActiveSection] = useState<'reports' | 'prescriptions'>('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportModal, setSelectedReportModal] = useState<MedicalReport | null>(null);
  const [selectedRxModal, setSelectedRxModal] = useState<Prescription | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Overall Statistics
  const totalReports = reports.length;
  const totalBiomarkers = reports.reduce((sum, r) => sum + r.testResults.length, 0);
  const totalAbnormal = reports.reduce(
    (sum, r) => sum + r.testResults.filter((t) => t.isAbnormal).length,
    0
  );

  // Filtered reports
  const filteredReports = reports.filter((rep) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesLab = rep.labName.toLowerCase().includes(q);
    const matchesFile = rep.filename.toLowerCase().includes(q);
    const matchesDate = rep.reportDate.includes(q);
    const matchesBiomarker = rep.testResults.some(
      (t) =>
        t.testName.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
    return matchesLab || matchesFile || matchesDate || matchesBiomarker;
  });

  // Filtered prescriptions
  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesDoc = rx.doctorName.toLowerCase().includes(q);
    const matchesFile = rx.filename.toLowerCase().includes(q);
    const matchesMed = rx.medicines.some((m) => m.name.toLowerCase().includes(q));
    return matchesDoc || matchesFile || matchesMed;
  });

  // Export report to CSV
  const handleExportCSV = (rep: MedicalReport) => {
    const headers = ['Test Name', 'Result Value', 'Unit', 'Reference Range', 'Status', 'Category'];
    const rows = rep.testResults.map((t) => [
      `"${t.testName.replace(/"/g, '""')}"`,
      t.value,
      `"${t.unit}"`,
      `"${(t.referenceRange || '').replace(/"/g, '""')}"`,
      t.isAbnormal ? 'Abnormal' : 'Normal',
      `"${(t.category || 'General Health').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      `"Report: ${rep.filename.replace(/"/g, '""')}"`,
      `"Laboratory: ${rep.labName.replace(/"/g, '""')}"`,
      `"Date: ${rep.reportDate}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rep.filename.replace(/\.[^/.]+$/, '')}_details.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16 pt-2 max-w-7xl mx-auto">
      {/* Header & Overview Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-extrabold mb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Health Records & History Archive</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Parsed Report Details History
          </h1>
          <p className="text-xs sm:text-sm mt-1 font-medium text-slate-500 dark:text-emerald-200/70">
            Review, inspect, compare, and export all medical lab reports and doctor prescriptions processed by AI.
          </p>
        </div>

        {setActiveTab && (
          <button
            onClick={() => setActiveTab('upload')}
            className="self-start md:self-center px-5 py-3 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Report</span>
          </button>
        )}
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="card-subtle rounded-3xl p-5 border border-slate-200 dark:border-emerald-900/30 space-y-1">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Stored Lab Reports</span>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl font-black">{totalReports}</p>
            <span className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-500 text-sm">📊</span>
          </div>
        </div>

        <div className="card-subtle rounded-3xl p-5 border border-slate-200 dark:border-emerald-900/30 space-y-1">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Biomarkers Tracked</span>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {totalBiomarkers}
            </p>
            <span className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Activity className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="card-subtle rounded-3xl p-5 border border-slate-200 dark:border-emerald-900/30 space-y-1">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Attention Findings</span>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {totalAbnormal}
            </p>
            <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="card-subtle rounded-3xl p-5 border border-slate-200 dark:border-emerald-900/30 space-y-1">
          <span className="text-[11px] font-extrabold uppercase text-slate-400">Prescriptions</span>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {prescriptions.length}
            </p>
            <span className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-500">
              <FileText className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Section Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex bg-slate-100 dark:bg-[#031f17] p-1.5 rounded-2xl border border-slate-200 dark:border-emerald-900/40 w-full sm:w-auto">
          <button
            onClick={() => setActiveSection('reports')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSection === 'reports'
                ? 'btn-primary-visible shadow-sm'
                : 'text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📊 Blood Lab Reports</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/20 text-current">
              {reports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('prescriptions')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSection === 'prescriptions'
                ? 'btn-primary-visible shadow-sm'
                : 'text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📄 Prescriptions</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/20 text-current">
              {prescriptions.length}
            </span>
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSection === 'reports'
                ? 'Search by lab, biomarker, date...'
                : 'Search doctor, medicine...'
            }
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/40 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* SECTION 1: Blood Lab Reports History */}
      {activeSection === 'reports' && (
        <div className="space-y-6">
          {filteredReports.length === 0 ? (
            <div className="card-subtle rounded-3xl p-12 text-center border-2 border-dashed border-slate-300 dark:border-emerald-900/40 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 mx-auto text-2xl">
                📊
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-extrabold">No Blood Lab Reports Found</h3>
                <p className="text-xs text-slate-500 dark:text-emerald-200/70 font-medium">
                  {searchQuery
                    ? 'No reports matched your search query. Try clearing the search.'
                    : 'You haven’t saved any blood reports yet. Upload your PDF in the Upload Center to store parsed biomarker details.'}
                </p>
              </div>

              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 rounded-2xl btn-primary-visible text-xs font-extrabold inline-flex items-center space-x-2 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Blood Report PDF</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredReports.map((rep) => {
                const abnormalCount = rep.testResults.filter((t) => t.isAbnormal).length;
                const isExpanded = expandedReportId === rep.id;

                return (
                  <div
                    key={rep.id}
                    className="card-subtle rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-emerald-900/40 hover:border-emerald-500/40 transition-all shadow-md"
                  >
                    {/* Report Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-emerald-900/30 pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                            <span>{rep.filename}</span>
                          </h3>
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                            {rep.testResults.length} Biomarkers
                          </span>
                          {abnormalCount > 0 ? (
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{abnormalCount} Outside Range</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>All Within Range</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-emerald-200/70 font-semibold pt-1">
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{rep.labName}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Report Date: {rep.reportDate}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleExportCSV(rep)}
                          className="p-2.5 rounded-xl btn-secondary-visible text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Download CSV"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden lg:inline">Export CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedReportId(isExpanded ? null : rep.id)}
                          className="px-3.5 py-2.5 rounded-xl btn-secondary-visible text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{isExpanded ? 'Hide Details' : 'View All Details'}</span>
                        </button>

                        {setActiveTab && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('comparison')}
                            className="px-3.5 py-2.5 rounded-xl btn-primary-visible text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            title="Compare in Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Compare</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteReport(rep.id)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-emerald-900/30 transition-colors cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Summary snippet */}
                    {rep.summary && (
                      <p className="text-xs p-3 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 text-slate-600 dark:text-emerald-200/80 font-medium">
                        {rep.summary}
                      </p>
                    )}

                    {/* Quick Preview Chips (Top 8 tests) */}
                    {!isExpanded && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Key Parsed Results Preview:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {rep.testResults.slice(0, 8).map((t, idx) => (
                            <div
                              key={idx}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                                t.isAbnormal
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-slate-100 dark:bg-emerald-950/40 text-slate-700 dark:text-emerald-200 border-slate-200 dark:border-emerald-900/40'
                              }`}
                            >
                              <span>{t.testName}:</span>
                              <span className="font-extrabold">
                                {t.value} {t.unit}
                              </span>
                              {t.isAbnormal && <span className="text-[10px]">⚠️</span>}
                            </div>
                          ))}
                          {rep.testResults.length > 8 && (
                            <button
                              type="button"
                              onClick={() => setExpandedReportId(rep.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-500 hover:underline cursor-pointer"
                            >
                              +{rep.testResults.length - 8} more biomarkers...
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Full On-Page Expanded Table of Parsed Biomarkers */}
                    {isExpanded && (
                      <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-emerald-900/30">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
                            <span>Complete Extracted Biomarker Table ({rep.testResults.length}):</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setSelectedReportModal(rep)}
                            className="text-xs font-bold text-emerald-500 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Open in Fullscreen Modal</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-emerald-900/40">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-emerald-950/60 uppercase font-extrabold text-[10px] text-slate-400 border-b border-slate-200 dark:border-emerald-900/40">
                              <tr>
                                <th className="px-4 py-3">Biomarker / Test Name</th>
                                <th className="px-4 py-3">Patient Result Value</th>
                                <th className="px-4 py-3">Reference Range</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Category</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-emerald-900/20 font-semibold">
                              {rep.testResults.map((t, idx) => (
                                <tr
                                  key={idx}
                                  className={`hover:bg-slate-50 dark:hover:bg-emerald-950/30 transition-colors ${
                                    t.isAbnormal ? 'bg-amber-500/5' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">
                                    {t.testName}
                                  </td>
                                  <td className="px-4 py-3 font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                                    {t.value} <span className="text-xs font-bold text-slate-400">{t.unit}</span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-emerald-200/70">
                                    {t.referenceRange || 'Standard'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                        t.isAbnormal
                                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                                      }`}
                                    >
                                      {t.isAbnormal ? '⚠ Out of Range' : '✓ Normal'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-[11px] text-slate-400">
                                    {t.category || 'General Health'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Doctor Prescriptions History */}
      {activeSection === 'prescriptions' && (
        <div className="space-y-6">
          {filteredPrescriptions.length === 0 ? (
            <div className="card-subtle rounded-3xl p-12 text-center border-2 border-dashed border-slate-300 dark:border-emerald-900/40 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 mx-auto text-2xl">
                📄
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-extrabold">No Prescriptions Found</h3>
                <p className="text-xs text-slate-500 dark:text-emerald-200/70 font-medium">
                  {searchQuery
                    ? 'No prescriptions matched your search query.'
                    : 'Upload your doctor prescription in the Upload Center to store medications and schedules.'}
                </p>
              </div>

              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 rounded-2xl btn-primary-visible text-xs font-extrabold inline-flex items-center space-x-2 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Doctor Prescription</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPrescriptions.map((rx) => (
                <div key={rx.id} className="card-subtle rounded-3xl p-6 space-y-4 shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-extrabold">{rx.filename}</h3>
                      <p className="text-xs flex items-center text-slate-500 dark:text-emerald-200/70">
                        <User className="w-3.5 h-3.5 mr-1 text-slate-400" /> {rx.doctorName}
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      {rx.medicines.length} Medicines
                    </span>
                  </div>

                  <div className="text-xs flex items-center justify-between pt-3 border-t border-slate-200 dark:border-emerald-900/30">
                    <span className="text-slate-400 font-semibold">Uploaded: {rx.date}</span>
                    {rx.ambiguousCount > 0 ? (
                      <span className="text-amber-500 font-bold text-xs flex items-center gap-1">
                        ⚠️ {rx.ambiguousCount} needs review
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={() => setSelectedRxModal(rx)}
                      className="flex-1 py-2.5 rounded-2xl btn-secondary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Medications</span>
                    </button>

                    <button
                      onClick={() => onDeletePrescription(rx.id)}
                      className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-emerald-900/30 transition-colors cursor-pointer"
                      title="Delete Prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lab Report Detail Modal */}
      {selectedReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="card-subtle rounded-3xl p-6 sm:p-8 max-w-4xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-emerald-900/50">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-emerald-900/30">
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold">{selectedReportModal.filename}</h3>
                <p className="text-xs text-slate-400 font-bold">
                  {selectedReportModal.labName} • Report Date: {selectedReportModal.reportDate}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReportModal(null);
                  setReportSearchQuery('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal search & category filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Filter biomarkers..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/40 outline-none"
                />
              </div>

              <button
                onClick={() => handleExportCSV(selectedReportModal)}
                className="px-4 py-2 rounded-xl btn-secondary-visible text-xs font-bold flex items-center gap-1.5 self-start cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Full Report Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-emerald-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-emerald-950/60 uppercase font-extrabold text-[10px] text-slate-400 border-b border-slate-200 dark:border-emerald-900/40">
                  <tr>
                    <th className="px-4 py-3">Biomarker / Test Name</th>
                    <th className="px-4 py-3">Patient Result Value</th>
                    <th className="px-4 py-3">Reference Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-emerald-900/20 font-semibold">
                  {selectedReportModal.testResults
                    .filter((t) => {
                      if (!reportSearchQuery.trim()) return true;
                      const q = reportSearchQuery.toLowerCase();
                      return (
                        t.testName.toLowerCase().includes(q) ||
                        (t.category && t.category.toLowerCase().includes(q)) ||
                        t.unit.toLowerCase().includes(q)
                      );
                    })
                    .map((t, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 dark:hover:bg-emerald-950/30 transition-colors ${
                          t.isAbnormal ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-white">
                          {t.testName}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          {t.value} <span className="text-xs font-bold text-slate-400">{t.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-emerald-200/70">
                          {t.referenceRange || 'Standard'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                              t.isAbnormal
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {t.isAbnormal ? '⚠ Out of Range' : '✓ Normal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">
                          {t.category || 'General Health'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReportModal(null)}
                className="px-6 py-2.5 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rx Detail Modal */}
      {selectedRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="card-subtle rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-200 dark:border-emerald-900/50">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-emerald-900/30">
              <h3 className="text-xl font-extrabold">{selectedRxModal.filename}</h3>
              <button
                onClick={() => setSelectedRxModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-500 dark:text-emerald-200/70">
              <p>
                <span className="font-bold text-slate-800 dark:text-white">Doctor:</span> {selectedRxModal.doctorName}
              </p>
              <p>
                <span className="font-bold text-slate-800 dark:text-white">Date:</span> {selectedRxModal.date}
              </p>
              {selectedRxModal.notes && (
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">Notes:</span> {selectedRxModal.notes}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Extracted Medications ({selectedRxModal.medicines.length}):
              </h4>
              {selectedRxModal.medicines.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-extrabold text-sm block">{m.name}</span>
                    <span className="block mt-0.5 text-slate-500 dark:text-emerald-200/70">
                      {m.strength} • {m.timing} • {m.duration_days} days
                    </span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                    {m.frequency}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedRxModal(null)}
              className="w-full py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
