import React, { useState } from 'react';
import { FileText, Sparkles, User, Eye, Trash2 } from 'lucide-react';
import type { Prescription, MedicalReport } from '../types';

interface ReportsHistoryProps {
  prescriptions: Prescription[];
  reports: MedicalReport[];
  onDeletePrescription: (id: string) => void;
  onDeleteReport: (id: string) => void;
}

export const ReportsHistory: React.FC<ReportsHistoryProps> = ({
  prescriptions,
  reports,
  onDeletePrescription,
  onDeleteReport,
}) => {
  const [selectedRxModal, setSelectedRxModal] = useState<Prescription | null>(null);
  const [selectedReportModal, setSelectedReportModal] = useState<MedicalReport | null>(null);

  return (
    <div className="space-y-8 pb-16 pt-2 max-w-7xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold">Medical Reports & Prescriptions Archive</h1>
        <p className="text-sm mt-1 font-medium">
          Access and review all stored prescriptions and lab reports processed by MedTrack AI.
        </p>
      </div>

      {/* Prescriptions Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold flex items-center space-x-2.5">
          <FileText className="w-5 h-5 text-emerald-500" />
          <span>Doctor Prescriptions ({prescriptions.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="card-subtle rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold">{rx.filename}</h3>
                  <p className="text-xs flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-slate-400" /> {rx.doctorName}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  {rx.medicines.length} Medicines
                </span>
              </div>

              <div className="text-xs flex items-center justify-between pt-3 border-t border-slate-200 dark:border-emerald-900/30">
                <span>Uploaded: {rx.date}</span>
                {rx.ambiguousCount > 0 ? (
                  <span className="text-amber-500 font-bold text-xs">
                    ⚠️ {rx.ambiguousCount} item flagged for review
                  </span>
                ) : (
                  <span className="text-emerald-500 font-bold text-xs">✓ Verified</span>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={() => setSelectedRxModal(rx)}
                  className="flex-1 py-2.5 rounded-2xl btn-secondary-visible text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Extracted Details</span>
                </button>

                <button
                  onClick={() => onDeletePrescription(rx.id)}
                  className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-emerald-900/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lab Reports Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-extrabold flex items-center space-x-2.5">
          <Sparkles className="w-5 h-5 text-cyan-500" />
          <span>Lab & Blood Reports ({reports.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((rep) => (
            <div key={rep.id} className="card-subtle rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold">{rep.filename}</h3>
                  <p className="text-xs">{rep.labName}</p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                  {rep.testResults.length} Biomarkers
                </span>
              </div>

              <p className="text-xs p-3.5 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30">
                {rep.summary}
              </p>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={() => setSelectedReportModal(rep)}
                  className="flex-1 py-2.5 rounded-2xl btn-secondary-visible text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Scanned Results</span>
                </button>

                <button
                  onClick={() => onDeleteReport(rep.id)}
                  className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-emerald-900/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rx Detail Modal */}
      {selectedRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="card-subtle rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-200 dark:border-emerald-900/50">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-emerald-900/30">
              <h3 className="text-xl font-extrabold">{selectedRxModal.filename}</h3>
              <button
                onClick={() => setSelectedRxModal(null)}
                className="hover:opacity-75 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="font-semibold">Doctor:</span> {selectedRxModal.doctorName}</p>
              <p><span className="font-semibold">Date:</span> {selectedRxModal.date}</p>
              <p><span className="font-semibold">Notes:</span> {selectedRxModal.notes}</p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Extracted Medications:</h4>
              {selectedRxModal.medicines.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 text-xs flex justify-between">
                  <div>
                    <span className="font-extrabold text-sm block">{m.name}</span>
                    <span className="block mt-0.5 text-slate-500 dark:text-emerald-200/70">{m.strength} • {m.timing} • {m.duration_days} days</span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{m.frequency}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedRxModal(null)}
              className="w-full py-3 rounded-2xl btn-secondary-visible text-xs font-bold cursor-pointer"
            >
              Close Archive Viewer
            </button>
          </div>
        </div>
      )}

      {/* Lab Report Detail Modal */}
      {selectedReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="card-subtle rounded-3xl p-8 max-w-lg w-full space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-emerald-900/50">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-emerald-900/30">
              <h3 className="text-xl font-extrabold">{selectedReportModal.filename}</h3>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="hover:opacity-75 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs">{selectedReportModal.labName} • {selectedReportModal.reportDate}</p>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Scanned Biomarker Parameters:</h4>
              {selectedReportModal.testResults.map((t, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-extrabold block">{t.testName}</span>
                    <span className="text-[11px] text-slate-500 dark:text-emerald-200/70">Ref Range: {t.referenceRange}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{t.value} {t.unit}</span>
                    {t.isAbnormal && <span className="text-[11px] text-amber-500 block font-bold">Abnormal</span>}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedReportModal(null)}
              className="w-full py-3 rounded-2xl btn-secondary-visible text-xs font-bold cursor-pointer"
            >
              Close Archive Viewer
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
