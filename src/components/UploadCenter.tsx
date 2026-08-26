import React, { useState } from 'react';
import { Upload, CheckCircle2, ArrowRight, Sparkles, Plus, Trash2, FileText } from 'lucide-react';
import type { Prescription, MedicineScheduleItem, MedicalReport, ExtractedMedicine, ExtractedTestResult } from '../types';
import { parsePrescriptionClient, generateSchedulesFromMedicines, parseLabReportClient, extractTextFromPdfFile } from '../services/ocrEngine';

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
  const [customText, setCustomText] = useState('');
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
    let textToParse = customText;

    // 1. If file is a PDF, extract embedded text streams
    if (selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.type === 'application/pdf') {
      try {
        const pdfText = await extractTextFromPdfFile(selectedFile);
        if (pdfText && pdfText.length > 5) {
          textToParse = pdfText;
        }
      } catch (err) {
        console.error('PDF extraction error:', err);
      }
    }
    // 2. If file is text-based (.txt, .md, .csv)
    else if (selectedFile.type.includes('text') || selectedFile.name.endsWith('.txt')) {
      try {
        textToParse = await selectedFile.text();
      } catch {
        textToParse = customText;
      }
    }

    if (activeType === 'prescription') {
      const parsedData = await parsePrescriptionClient(textToParse, selectedFile.name);
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
      const report = await parseLabReportClient(selectedFile.name, textToParse);
      setParsedReport(report);
    }
    setParsing(false);
  };

  const handleManualScan = async () => {
    if (!customText.trim()) return;
    setParsing(true);
    if (activeType === 'prescription') {
      const parsedData = await parsePrescriptionClient(customText, 'Custom_Prescription.txt');
      const rx: Prescription = {
        id: 'rx-' + Math.random().toString(36).substr(2, 7),
        filename: 'Prescription_Scan.txt',
        doctorName: parsedData.doctorName,
        date: parsedData.date,
        medicines: parsedData.medicines,
        ambiguousCount: parsedData.ambiguousCount,
        notes: parsedData.notes,
        uploadedAt: new Date().toISOString(),
      };
      setParsedRx(rx);
    } else {
      const report = await parseLabReportClient('Custom_Lab_Report.txt', customText);
      setParsedReport(report);
    }
    setParsing(false);
  };

  // Medicine Item Modifiers by Index
  const handleRemoveMedicine = (idx: number) => {
    if (!parsedRx) return;
    setParsedRx({
      ...parsedRx,
      medicines: parsedRx.medicines.filter((_, i) => i !== idx),
    });
  };

  const handleAddCustomMedicine = () => {
    if (!parsedRx) return;
    const newMed: ExtractedMedicine = {
      id: 'med-' + Math.random().toString(36).substr(2, 6),
      name: 'New Medicine',
      strength: '500 mg',
      dose: '1 tablet',
      frequency: 'Twice daily',
      timing: 'After food',
      duration_days: 5,
      confidence: 1.0,
      needs_review: false,
    };
    setParsedRx({
      ...parsedRx,
      medicines: [...parsedRx.medicines, newMed],
    });
  };

  const handleUpdateMedicineField = (idx: number, field: keyof ExtractedMedicine, val: any) => {
    if (!parsedRx) return;
    setParsedRx({
      ...parsedRx,
      medicines: parsedRx.medicines.map((m, i) => (i === idx ? { ...m, [field]: val } : m)),
    });
  };

  // Biomarker Item Modifiers by Index
  const handleRemoveBiomarker = (idx: number) => {
    if (!parsedReport) return;
    setParsedReport({
      ...parsedReport,
      testResults: parsedReport.testResults.filter((_, i) => i !== idx),
    });
  };

  const handleAddCustomBiomarker = () => {
    if (!parsedReport) return;
    const newTest: ExtractedTestResult = {
      id: 'tr-' + Math.random().toString(36).substr(2, 6),
      testName: 'New Biomarker Test',
      value: 100,
      unit: 'mg/dL',
      referenceRange: '70 - 110',
      category: 'General Health',
      isAbnormal: false,
    };
    setParsedReport({
      ...parsedReport,
      testResults: [...parsedReport.testResults, newTest],
    });
  };

  const handleUpdateBiomarkerField = (idx: number, field: keyof ExtractedTestResult, val: any) => {
    if (!parsedReport) return;
    setParsedReport({
      ...parsedReport,
      testResults: parsedReport.testResults.map((t, i) => (i === idx ? { ...t, [field]: val } : t)),
    });
  };

  const handleConfirmRx = () => {
    if (!parsedRx || parsedRx.medicines.length === 0) return;
    const newSchedules = generateSchedulesFromMedicines(parsedRx.medicines, parsedRx.id);
    onPrescriptionConfirmed(parsedRx, newSchedules);
    setActiveTab('schedule');
  };

  const handleConfirmReport = () => {
    if (!parsedReport || parsedReport.testResults.length === 0) return;
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
          Upload your scanned document or paste text directly. AI automatically extracts medicines, timings, dosages, and lab biomarker values.
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

      {/* Upload Zone & Text Input */}
      {!parsedRx && !parsedReport && (
        <div className="space-y-6">
          {/* Drag & Drop Box */}
          <div className="card-subtle rounded-3xl p-8 sm:p-10 text-center border-2 border-dashed border-slate-300 dark:border-emerald-900/60 hover:border-emerald-500 transition-all space-y-5">
            
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold">
                {parsing ? 'Parsing Document with AI...' : `Upload your ${activeType === 'prescription' ? 'Prescription Scan / Photo' : 'Blood Test PDF / Scan'}`}
              </h3>
              <p className="text-xs font-medium">
                Supported formats: JPG, PNG, PDF, WEBP, TXT (Max 15 MB)
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
                <input type="file" onChange={handleFileDrop} accept="image/*,.pdf,.txt" className="hidden" />
              </label>
            )}

          </div>

          {/* Optional Direct Paste / Manual Text Input */}
          <div className="card-subtle rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>
                  {activeType === 'prescription'
                    ? 'Or Paste / Type Prescription Text Directly:'
                    : 'Or Paste / Type Blood Report Table Directly:'}
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                {activeType === 'prescription'
                  ? 'e.g. Tab Paracetamol 650mg twice daily after food 5 days'
                  : 'e.g. HbA1c 6.2 %, Fasting Blood Sugar 108 mg/dL'}
              </span>
            </div>

            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={
                activeType === 'prescription'
                  ? 'e.g.\n1. Omeprazole 20mg - 1 tablet once daily before breakfast 5 days\n2. Amoxicillin 500mg - 1 capsule once daily after meals 5 days\n3. Zerodol-P 500mg - 1 tablet once daily after meals 5 days\n4. Aspirin 250mg - 1 tablet twice daily after meals 3 days'
                  : 'e.g.\nHbA1c (Glycated Hemoglobin) 6.2 % 4.0 - 5.6\nFasting Blood Sugar 108 mg/dL 70 - 99\nVitamin D (25-OH) 35.0 ng/mL 30.0 - 100.0\nTotal Cholesterol 195 mg/dL < 200'
              }
              className="w-full rounded-2xl p-3.5 text-xs font-medium outline-none resize-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleManualScan}
                disabled={!customText.trim() || parsing}
                className="px-5 py-2.5 rounded-xl btn-primary-visible text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                Parse Typed Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Parsed Prescription Result Card with Full Inline Editing */}
      {parsedRx && (
        <div className="card-subtle rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-emerald-900/30 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-extrabold">Extracted Prescription Details</h3>
                <span className="text-xs text-slate-400">
                  Doctor: {parsedRx.doctorName} • Date: {parsedRx.date}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCustomMedicine}
                className="px-3 py-1.5 rounded-xl btn-secondary-visible text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
                ✓ {parsedRx.medicines.length} Medicines
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              Verify & Edit Extracted Medicines ({parsedRx.medicines.length}):
            </h4>

            {parsedRx.medicines.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-bold">
                  {/* Medicine Name */}
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Medicine Name</label>
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => handleUpdateMedicineField(idx, 'name', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Strength & Dose */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Strength (e.g. 500mg)</label>
                    <input
                      type="text"
                      value={m.strength}
                      onChange={(e) => handleUpdateMedicineField(idx, 'strength', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Frequency</label>
                    <select
                      value={m.frequency}
                      onChange={(e) => handleUpdateMedicineField(idx, 'frequency', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    >
                      <option value="Once daily">Once daily (Morning)</option>
                      <option value="Once daily (Night)">Once daily (Night)</option>
                      <option value="Twice daily">Twice daily (Morning & Night)</option>
                      <option value="Three times daily">Three times daily (M/A/N)</option>
                      <option value="Every 6 hours (SOS)">Every 6 hours (SOS)</option>
                      <option value="As needed (SOS)">As needed (SOS)</option>
                    </select>
                  </div>

                  {/* Timing & Action */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Food Timing</label>
                      <select
                        value={m.timing}
                        onChange={(e) => handleUpdateMedicineField(idx, 'timing', e.target.value)}
                        className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      >
                        <option value="After food">After food</option>
                        <option value="Before food">Before food</option>
                        <option value="Take 30 min before breakfast">Take 30 min before breakfast</option>
                        <option value="With food">With food</option>
                        <option value="As needed (max 4000mg/day)">As needed (max 4000mg/day)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove this medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-emerald-900/30">
            <button
              onClick={() => {
                setParsedRx(null);
                setCustomText('');
              }}
              className="px-5 py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
            >
              Re-upload / Cancel
            </button>
            <button
              onClick={handleConfirmRx}
              disabled={parsedRx.medicines.length === 0}
              className="px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <span>Add {parsedRx.medicines.length} Medicine(s) to Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Parsed Blood Report Result Card with Full Inline Editing */}
      {parsedReport && (
        <div className="card-subtle rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-emerald-900/30 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-extrabold">Extracted Blood Test Results</h3>
                <span className="text-xs text-slate-400">Lab: {parsedReport.labName} • Date: {parsedReport.reportDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCustomBiomarker}
                className="px-3 py-1.5 rounded-xl btn-secondary-visible text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Biomarker</span>
              </button>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40">
                📊 {parsedReport.testResults.length} Biomarkers Extracted
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              Verify & Edit Extracted Biomarkers ({parsedReport.testResults.length}):
            </h4>

            {parsedReport.testResults.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-bold items-center">
                  {/* Test Name */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Test / Biomarker Name</label>
                    <input
                      type="text"
                      value={t.testName}
                      onChange={(e) => handleUpdateBiomarkerField(idx, 'testName', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Value & Unit */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Value &amp; Unit</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={t.value}
                        onChange={(e) => handleUpdateBiomarkerField(idx, 'value', parseFloat(e.target.value) || 0)}
                        className="w-20 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                      <input
                        type="text"
                        value={t.unit}
                        onChange={(e) => handleUpdateBiomarkerField(idx, 'unit', e.target.value)}
                        className="w-20 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Reference Range */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Ref Range</label>
                    <input
                      type="text"
                      value={t.referenceRange}
                      onChange={(e) => handleUpdateBiomarkerField(idx, 'referenceRange', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Status & Delete */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateBiomarkerField(idx, 'isAbnormal', !t.isAbnormal)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer border ${
                        t.isAbnormal
                          ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                      }`}
                    >
                      {t.isAbnormal ? '⚠ Abnormal' : '✓ Normal'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveBiomarker(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove this test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-emerald-900/30">
            <button
              onClick={() => {
                setParsedReport(null);
                setCustomText('');
              }}
              className="px-5 py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
            >
              Re-upload File
            </button>
            <button
              onClick={handleConfirmReport}
              disabled={parsedReport.testResults.length === 0}
              className="px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50"
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
