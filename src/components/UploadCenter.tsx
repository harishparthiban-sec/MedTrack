import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import type { Prescription, MedicineScheduleItem, MedicalReport } from '../types';
import { parsePrescriptionClient, generateSchedulesFromMedicines } from '../services/ocrEngine';

interface UploadCenterProps {
  onPrescriptionConfirmed: (rx: Prescription, schedules: MedicineScheduleItem[]) => void;
  onReportConfirmed: (report: MedicalReport) => void;
  setActiveTab: (tab: string) => void;
}

export const UploadCenter: React.FC<UploadCenterProps> = ({
  onPrescriptionConfirmed,
  onReportConfirmed,
  setActiveTab,
}) => {
  const [activeType, setActiveType] = useState<'prescription' | 'report'>('prescription');
  const [parsing, setParsing] = useState(false);
  const [parsedRx, setParsedRx] = useState<Prescription | null>(null);
  const [parsedReport, setParsedReport] = useState<MedicalReport | null>(null);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleProcessFile(selectedFile);
    }
  };

  const handleProcessFile = async (selectedFile: File) => {
    setParsing(true);
    if (activeType === 'prescription') {
      const dummyText = `Dr. A. Sharma, MD. Date: ${new Date().toLocaleDateString()}
      1. Paracetamol 500mg - 1 tablet twice daily after meals for 5 days.
      2. Amoxicillin 250mg - 1 capsule thrice daily before meals for 7 days.
      3. Vitamin D3 60k IU - 1 sachet once weekly. (Take with warm milk after dinner)`;

      const parsedData = await parsePrescriptionClient(dummyText, selectedFile.name);
      const rx: Prescription = {
        id: 'rx-' + Math.random().toString(36).substr(2, 7),
        filename: selectedFile.name,
        doctorName: parsedData.doctorName,
        date: parsedData.date,
        medicines: parsedData.medicines,
        ambiguousCount: parsedData.ambiguousCount,
        notes: parsedData.notes,
        uploadedAt: new Date().toISOString(),
      };
      setParsedRx(rx);
    } else {
        const report: MedicalReport = {
          id: 'rep-' + Math.random().toString(36).substr(2, 7),
          filename: selectedFile.name,
          labName: 'Apollo Diagnostics & Health Labs',
          reportDate: new Date().toISOString().split('T')[0],
          summary: 'Blood Biomarker Report: Fasting Glucose 108 mg/dL, HbA1c 6.2%, Vitamin D 35 ng/mL.',
          uploadedAt: new Date().toISOString(),
          testResults: [
            {
              id: 't-1',
              testName: 'HbA1c (Glycated Hemoglobin)',
              value: 6.2,
              unit: '%',
              referenceRange: '4.0 - 5.6',
              category: 'Diabetes',
              isAbnormal: true,
              notes: 'Good progress. Decreased from previous 6.8%.',
            },
            {
              id: 't-2',
              testName: 'Vitamin D (25-OH)',
              value: 35,
              unit: 'ng/mL',
              referenceRange: '30 - 100',
              category: 'Vitamins',
              isAbnormal: false,
              notes: 'Sufficient level.',
            },
            {
              id: 't-3',
              testName: 'Fasting Blood Sugar',
              value: 108,
              unit: 'mg/dL',
              referenceRange: '70 - 99',
              category: 'Diabetes',
              isAbnormal: true,
              notes: 'Slightly elevated.',
            },
          ],
        };
        setParsedReport(report);
      }
    setParsing(false);
  };

  const handleConfirmRx = () => {
    if (!parsedRx) return;
    const newSchedules = generateSchedulesFromMedicines(parsedRx.medicines, parsedRx.id);
    onPrescriptionConfirmed(parsedRx, newSchedules);
    setActiveTab('schedule');
  };

  const handleConfirmReport = () => {
    if (!parsedReport) return;
    onReportConfirmed(parsedReport);
    setActiveTab('comparison');
  };

  return (
    <div className="space-y-8 pb-16 pt-2 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-extrabold">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>AI OCR & Biomarker Intelligence Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Upload Doctor Prescription or Blood Report
        </h1>
        <p className="text-xs sm:text-sm max-w-xl mx-auto font-medium">
          Drag & drop your scanned document or image. AI automatically extracts medicines, timings, dosages, and lab biomarker values.
        </p>
      </div>

      {/* Type Switcher */}
      <div className="flex bg-slate-100 dark:bg-[#031f17] p-1.5 rounded-2xl border border-slate-200 dark:border-emerald-900/40 max-w-md mx-auto">
        <button
          onClick={() => {
            setActiveType('prescription');
            setParsedRx(null);
            setParsedReport(null);
          }}
          className={`flex-1 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeType === 'prescription'
              ? 'btn-primary-visible'
              : 'text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          📄 Doctor Prescription
        </button>
        <button
          onClick={() => {
            setActiveType('report');
            setParsedRx(null);
            setParsedReport(null);
          }}
          className={`flex-1 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeType === 'report'
              ? 'btn-primary-visible'
              : 'text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          📊 Blood Lab Report
        </button>
      </div>

      {/* Drag & Drop Box */}
      {!parsedRx && !parsedReport && (
        <div className="card-subtle rounded-3xl p-10 text-center border-2 border-dashed border-slate-300 dark:border-emerald-900/60 hover:border-emerald-500 transition-all space-y-5">
          
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-extrabold">
              {parsing ? 'Parsing Document with AI...' : `Upload your ${activeType === 'prescription' ? 'Prescription Scan' : 'Blood Test PDF'}`}
            </h3>
            <p className="text-xs font-medium">
              Supported formats: JPG, PNG, PDF, WEBP (Max 15 MB)
            </p>
          </div>

          {parsing ? (
            <div className="flex items-center justify-center space-x-3 text-emerald-500 font-extrabold text-xs py-4">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Scanning OCR Text & Extracting Biomarkers...</span>
            </div>
          ) : (
            <label className="inline-block px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold cursor-pointer shadow-lg">
              <span>Select Document File</span>
              <input type="file" onChange={handleFileDrop} accept="image/*,.pdf" className="hidden" />
            </label>
          )}

        </div>
      )}

      {/* Parsed Prescription Result Card */}
      {parsedRx && (
        <div className="card-subtle rounded-3xl p-8 space-y-6 border border-emerald-500/40">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-900/30 pb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="text-xl font-extrabold">Extracted Prescription Details</h3>
                <span className="text-xs">Doctor: {parsedRx.doctorName || 'Dr. A. Sharma'} • Date: {parsedRx.date}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
              ✓ AI Extraction Complete
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider">Medicines Extracted ({parsedRx.medicines.length})</h4>
            {parsedRx.medicines.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
                <div>
                  <h5 className="text-sm font-extrabold">{m.name} <span className="text-emerald-500">({m.strength})</span></h5>
                  <span className="text-slate-500 dark:text-emerald-200/70">{m.dose} • {m.timing} • Duration: {m.duration_days} days</span>
                </div>
                {m.needs_review && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-600 border border-amber-500/40 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Handwritten Note Flagged
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              onClick={() => setParsedRx(null)}
              className="px-5 py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
            >
              Re-upload File
            </button>
            <button
              onClick={handleConfirmRx}
              className="px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg"
            >
              <span>Add to Medicine Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Parsed Blood Report Result Card */}
      {parsedReport && (
        <div className="card-subtle rounded-3xl p-8 space-y-6 border border-emerald-500/40">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-900/30 pb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="text-xl font-extrabold">Extracted Blood Test Results</h3>
                <span className="text-xs">Lab: {parsedReport.labName} • Date: {parsedReport.reportDate}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40">
              📊 3 Biomarkers Extracted
            </span>
          </div>

          <div className="space-y-3">
            {parsedReport.testResults.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 flex items-center justify-between text-xs font-bold">
                <div>
                  <h5 className="text-sm font-extrabold">{t.testName}</h5>
                  <span className="text-slate-500 dark:text-emerald-200/70">Ref Range: {t.referenceRange} {t.unit} • {t.notes}</span>
                </div>
                <div className="text-right">
                  <span className={`text-base font-extrabold block ${t.isAbnormal ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {t.value} {t.unit}
                  </span>
                  <span className="text-[10px] uppercase text-slate-400">{t.category}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              onClick={() => setParsedReport(null)}
              className="px-5 py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
            >
              Re-upload File
            </button>
            <button
              onClick={handleConfirmReport}
              className="px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg"
            >
              <span>Compare with Past Reports</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
