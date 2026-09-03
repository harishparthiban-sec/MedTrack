import React, { useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Search,
  Eye,
  EyeOff,
  Activity,
  Calendar,
} from 'lucide-react';
import type { Prescription, MedicineScheduleItem, MedicalReport, ExtractedMedicine, ExtractedTestResult } from '../types';
import { parsePrescriptionClient, generateSchedulesFromMedicines, parseLabReportClient, extractTextFromPdfFile, recognizeImageText } from '../services/ocrEngine';

interface UploadCenterProps {
  onPrescriptionConfirmed: (rx: Prescription, schedules: MedicineScheduleItem[]) => void;
  onReportConfirmed: (report: MedicalReport) => void;
  setActiveTab: (tab: string) => void;
  reportsCount?: number;
}

export const UploadCenter: React.FC<UploadCenterProps> = ({
  onPrescriptionConfirmed,
  onReportConfirmed,
  setActiveTab,
  reportsCount = 0,
}) => {
  const [activeType, setActiveType] = useState<'prescription' | 'report'>('prescription');
  const [parsing, setParsing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [parsedRx, setParsedRx] = useState<Prescription | null>(null);
  const [parsedReport, setParsedReport] = useState<MedicalReport | null>(null);
  const [rawPdfText, setRawPdfText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    // 3. If file is an Image (PNG, JPG, JPEG, WEBP) -> Run in-browser Optical Character Recognition
    else if (selectedFile.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(selectedFile.name)) {
      try {
        const ocrText = await recognizeImageText(selectedFile);
        if (ocrText && ocrText.length > 5) {
          textToParse = ocrText;
        }
      } catch (err) {
        console.error('Image OCR error:', err);
      }
    }

    setRawPdfText(textToParse);

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
      setFilterCategory('all');
      setSearchQuery('');
    }
    setParsing(false);
  };

  const handleManualScan = async () => {
    if (!customText.trim()) return;
    setParsing(true);
    setRawPdfText(customText);

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
      setFilterCategory('all');
      setSearchQuery('');
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

  const handleLoadSampleReport = async () => {
    setParsing(true);
    const sampleText = `Apollo Diagnostics Laboratory
Date: 2026-08-27
COMPLETE BLOOD COUNT & METABOLIC PANEL
Hemoglobin: 10.5 g/dL (12.0 - 15.0) Low
Total Leukocyte Count (TLC): 6200 cells/cumm (4000 - 11000)
Platelet Count: 2.8 lakhs/cumm (1.5 - 4.5)
HbA1c (Glycated Hemoglobin): 6.8 % (4.0 - 5.6) High
Fasting Blood Glucose: 118 mg/dL (70 - 100) High
Total Cholesterol: 215 mg/dL (< 200) High
LDL Cholesterol: 142 mg/dL (< 100) High
HDL Cholesterol: 44 mg/dL (> 40)
Serum Creatinine: 0.9 mg/dL (0.6 - 1.2)
TSH (Thyroid Stimulating Hormone): 3.2 uIU/mL (0.4 - 4.5)
Vitamin D (25-OH): 22.4 ng/mL (30.0 - 100.0) Low`;
    
    setRawPdfText(sampleText);
    const report = await parseLabReportClient('Apollo_Health_Report.pdf', sampleText);
    setParsedReport(report);
    setFilterCategory('all');
    setSearchQuery('');
    setParsing(false);
  };

  const handleLoadPresetPanel = (panelType: 'cbc' | 'diabetes' | 'lipid' | 'full') => {
    let presets: ExtractedTestResult[] = [];
    if (panelType === 'cbc') {
      presets = [
        { id: 'tr-c1', testName: 'Hemoglobin', value: 12.8, unit: 'g/dL', referenceRange: '12.0 - 15.0', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-c2', testName: 'Total Leukocyte Count (WBC)', value: 6500, unit: 'cells/cumm', referenceRange: '4000 - 11000', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-c3', testName: 'Neutrophils', value: 60, unit: '%', referenceRange: '40 - 75', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-c4', testName: 'Lymphocytes', value: 32, unit: '%', referenceRange: '20 - 45', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-c5', testName: 'Platelet Count', value: 2.6, unit: 'lakhs/cumm', referenceRange: '1.5 - 4.5', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-c6', testName: 'Packed Cell Volume (PCV)', value: 41, unit: '%', referenceRange: '36 - 48', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-c7', testName: 'Mean Corpuscular Volume (MCV)', value: 91, unit: 'fL', referenceRange: '80 - 100', category: 'Complete Blood Count', isAbnormal: false },
      ];
    } else if (panelType === 'diabetes') {
      presets = [
        { id: 'tr-d1', testName: 'HbA1c (Glycated Hemoglobin)', value: 6.6, unit: '%', referenceRange: '4.0 - 5.6', category: 'Diabetes', isAbnormal: true },
        { id: 'tr-d2', testName: 'Fasting Blood Glucose', value: 116, unit: 'mg/dL', referenceRange: '70 - 100', category: 'Diabetes', isAbnormal: true },
        { id: 'tr-d3', testName: 'Post Prandial Glucose (PPBS)', value: 155, unit: 'mg/dL', referenceRange: '70 - 140', category: 'Diabetes', isAbnormal: true },
        { id: 'tr-d4', testName: 'Serum Creatinine', value: 0.9, unit: 'mg/dL', referenceRange: '0.6 - 1.2', category: 'Kidney Function', isAbnormal: false },
        { id: 'tr-d5', testName: 'Vitamin D (25-OH)', value: 21.0, unit: 'ng/mL', referenceRange: '30.0 - 100.0', category: 'Vitamins', isAbnormal: true },
      ];
    } else if (panelType === 'lipid') {
      presets = [
        { id: 'tr-l1', testName: 'Total Cholesterol', value: 215, unit: 'mg/dL', referenceRange: '< 200', category: 'Lipid Profile', isAbnormal: true },
        { id: 'tr-l2', testName: 'Triglycerides', value: 175, unit: 'mg/dL', referenceRange: '< 150', category: 'Lipid Profile', isAbnormal: true },
        { id: 'tr-l3', testName: 'HDL Cholesterol', value: 42, unit: 'mg/dL', referenceRange: '> 40', category: 'Lipid Profile', isAbnormal: false },
        { id: 'tr-l4', testName: 'LDL Cholesterol', value: 138, unit: 'mg/dL', referenceRange: '< 100', category: 'Lipid Profile', isAbnormal: true },
        { id: 'tr-l5', testName: 'VLDL Cholesterol', value: 35, unit: 'mg/dL', referenceRange: '< 30', category: 'Lipid Profile', isAbnormal: true },
      ];
    } else {
      presets = [
        { id: 'tr-f1', testName: 'Hemoglobin', value: 11.2, unit: 'g/dL', referenceRange: '12.0 - 15.0', category: 'Complete Blood Count', isAbnormal: true },
        { id: 'tr-f2', testName: 'Total Leukocyte Count (TLC)', value: 5800, unit: 'cells/cumm', referenceRange: '4000 - 11000', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-f3', testName: 'Platelet Count', value: 2.8, unit: 'lakhs/cumm', referenceRange: '1.5 - 4.5', category: 'Complete Blood Count', isAbnormal: false },
        { id: 'tr-f4', testName: 'HbA1c (Glycated Hemoglobin)', value: 6.4, unit: '%', referenceRange: '4.0 - 5.6', category: 'Diabetes', isAbnormal: true },
        { id: 'tr-f5', testName: 'Fasting Blood Glucose', value: 108, unit: 'mg/dL', referenceRange: '70 - 100', category: 'Diabetes', isAbnormal: true },
        { id: 'tr-f6', testName: 'Total Cholesterol', value: 205, unit: 'mg/dL', referenceRange: '< 200', category: 'Lipid Profile', isAbnormal: true },
        { id: 'tr-f7', testName: 'LDL Cholesterol', value: 132, unit: 'mg/dL', referenceRange: '< 100', category: 'Lipid Profile', isAbnormal: true },
        { id: 'tr-f8', testName: 'HDL Cholesterol', value: 48, unit: 'mg/dL', referenceRange: '> 40', category: 'Lipid Profile', isAbnormal: false },
        { id: 'tr-f9', testName: 'Serum Creatinine', value: 0.9, unit: 'mg/dL', referenceRange: '0.6 - 1.2', category: 'Kidney Function', isAbnormal: false },
        { id: 'tr-f10', testName: 'TSH (Thyroid Stimulating)', value: 2.6, unit: 'uIU/mL', referenceRange: '0.4 - 4.5', category: 'Thyroid', isAbnormal: false },
        { id: 'tr-f11', testName: 'Vitamin D (25-OH)', value: 24.5, unit: 'ng/mL', referenceRange: '30.0 - 100.0', category: 'Vitamins', isAbnormal: true },
      ];
    }

    if (parsedReport) {
      setParsedReport({
        ...parsedReport,
        testResults: presets,
        summary: `Loaded ${presets.length} biomarkers. ${presets.filter((t) => t.isAbnormal).length} flagged as abnormal.`,
      });
    } else {
      setParsedReport({
        id: 'rep-' + Math.random().toString(36).substr(2, 6),
        filename: `${panelType.toUpperCase()}_Blood_Panel.pdf`,
        labName: 'Apollo Diagnostics Laboratory',
        reportDate: new Date().toISOString().split('T')[0],
        testResults: presets,
        summary: `Loaded ${presets.length} biomarkers. ${presets.filter((t) => t.isAbnormal).length} flagged as abnormal.`,
        uploadedAt: new Date().toISOString(),
      });
    }
  };

  const handleConfirmRx = () => {
    if (!parsedRx || parsedRx.medicines.length === 0) return;
    const newSchedules = generateSchedulesFromMedicines(parsedRx.medicines, parsedRx.id);
    onPrescriptionConfirmed(parsedRx, newSchedules);
    setActiveTab('schedule');
  };

  const handleSaveToHistory = () => {
    if (!parsedReport || parsedReport.testResults.length === 0) return;
    onReportConfirmed(parsedReport);
    setActiveTab('reports');
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
        <p className="text-xs sm:text-sm max-w-xl mx-auto font-medium text-slate-500 dark:text-emerald-200/70">
          Upload your scanned document or paste text directly. AI automatically extracts medicines, timings, dosages, and lab biomarker values.
        </p>

        {reportsCount > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Saved Report History ({reportsCount})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
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
              <p className="text-xs font-medium text-slate-400">
                Supported formats: JPG, PNG, PDF, WEBP, TXT (Max 15 MB)
              </p>
            </div>

            {parsing ? (
              <div className="flex items-center justify-center space-x-3 text-emerald-500 font-extrabold text-xs py-4">
                <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Scanning OCR Text & Extracting Biomarkers...</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="inline-block px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold cursor-pointer shadow-lg">
                  <span>Select Document File</span>
                  <input type="file" onChange={handleFileDrop} accept="image/*,.pdf,.txt" className="hidden" />
                </label>
                {activeType === 'report' && (
                  <button
                    type="button"
                    onClick={handleLoadSampleReport}
                    className="px-5 py-3.5 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Try Sample Lab Report</span>
                  </button>
                )}
              </div>
            )}

            {activeType === 'report' && !parsing && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleLoadPresetPanel('cbc')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 cursor-pointer"
                >
                  🩸 Complete Blood Count (CBC)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPresetPanel('diabetes')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 cursor-pointer"
                >
                  🩺 Diabetes & Vitamin Panel
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPresetPanel('lipid')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 cursor-pointer"
                >
                  🫀 Lipid & Cardiac Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPresetPanel('full')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 cursor-pointer"
                >
                  🌟 Full Health Checkup
                </button>
              </div>
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
                💊 {parsedRx.medicines.length} Medicines Extracted
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              Verify & Edit Extracted Medicines ({parsedRx.medicines.length}):
            </h4>

            {parsedRx.medicines.map((med, idx) => (
              <div
                key={med.id || idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-bold">
                  {/* Medicine Name */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Medicine Name</label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => handleUpdateMedicineField(idx, 'name', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Strength */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Strength (e.g. 500mg)</label>
                    <input
                      type="text"
                      value={med.strength}
                      onChange={(e) => handleUpdateMedicineField(idx, 'strength', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Frequency</label>
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => handleUpdateMedicineField(idx, 'frequency', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-bold items-center">
                  {/* Timing */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Food Timing</label>
                    <input
                      type="text"
                      value={med.timing}
                      onChange={(e) => handleUpdateMedicineField(idx, 'timing', e.target.value)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      value={med.duration_days}
                      onChange={(e) => handleUpdateMedicineField(idx, 'duration_days', parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Action */}
                  <div className="flex justify-end pt-3 sm:pt-0">
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

      {/* 2. Parsed Blood Report Result Card with Full Inline Editing & PDF View */}
      {parsedReport && (() => {
        const totalBiomarkers = parsedReport.testResults.length;
        const abnormalBiomarkers = parsedReport.testResults.filter((t) => t.isAbnormal).length;
        const normalBiomarkers = totalBiomarkers - abnormalBiomarkers;

        const uniqueCategories = Array.from(
          new Set(parsedReport.testResults.map((t) => t.category || 'General Health').filter(Boolean))
        );

        const displayedBiomarkers = parsedReport.testResults
          .map((t, idx) => ({ ...t, originalIndex: idx }))
          .filter((t) => {
            if (filterCategory === 'abnormal' && !t.isAbnormal) return false;
            if (filterCategory === 'normal' && t.isAbnormal) return false;
            if (filterCategory !== 'all' && filterCategory !== 'abnormal' && filterCategory !== 'normal') {
              if (t.category !== filterCategory) return false;
            }
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                t.testName.toLowerCase().includes(q) ||
                (t.category && t.category.toLowerCase().includes(q)) ||
                (t.unit && t.unit.toLowerCase().includes(q))
              );
            }
            return true;
          });

        return (
          <div className="card-subtle rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/40 shadow-xl">
            {/* Top Header Card */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 dark:border-emerald-900/30 pb-5 gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 flex-shrink-0 mt-0.5">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-extrabold tracking-tight">Extracted Blood Report Details</h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-emerald-950/60 border border-slate-200 dark:border-emerald-800/40 text-slate-600 dark:text-emerald-300">
                      📄 {parsedReport.filename}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-bold">Lab:</span>
                      <input
                        type="text"
                        value={parsedReport.labName}
                        onChange={(e) => setParsedReport({ ...parsedReport, labName: e.target.value })}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-emerald-950/40 border border-slate-300 dark:border-emerald-800/50 outline-none w-48 sm:w-60"
                        placeholder="Laboratory Name"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Date:
                      </span>
                      <input
                        type="date"
                        value={parsedReport.reportDate}
                        onChange={(e) => setParsedReport({ ...parsedReport, reportDate: e.target.value })}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-emerald-950/40 border border-slate-300 dark:border-emerald-800/50 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                {rawPdfText && (
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="px-3.5 py-2 rounded-xl btn-secondary-visible text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    {showRawText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showRawText ? 'Hide PDF Text' : 'View Extracted Text'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddCustomBiomarker}
                  className="px-3.5 py-2 rounded-xl btn-secondary-visible text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Biomarker</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Biomarkers</span>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{totalBiomarkers}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 font-extrabold text-sm">
                  📊
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">Normal / In Range</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{normalBiomarkers}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">Attention / Out of Range</span>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{abnormalBiomarkers}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Optional Raw Extracted PDF Text Accordion */}
            {showRawText && rawPdfText && (
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-700 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                    <FileText className="w-4 h-4" />
                    <span>Raw Extracted PDF Text Stream ({rawPdfText.split('\n').length} lines)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(rawPdfText)}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                  >
                    Copy Text
                  </button>
                </div>
                <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed text-[11px] text-slate-300">
                  {rawPdfText}
                </pre>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search biomarker (e.g. Hemoglobin, Glucose, TSH)..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/40 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetPanel('cbc')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  >
                    CBC
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetPanel('diabetes')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  >
                    Diabetes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetPanel('lipid')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  >
                    Lipid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetPanel('full')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  >
                    Full Panel
                  </button>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterCategory === 'all'
                      ? 'btn-primary-visible'
                      : 'bg-slate-100 dark:bg-emerald-950/40 text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-emerald-900/30'
                  }`}
                >
                  All ({totalBiomarkers})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('abnormal')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterCategory === 'abnormal'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                  }`}
                >
                  ⚠ Abnormal ({abnormalBiomarkers})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('normal')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    filterCategory === 'normal'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  ✓ Normal ({normalBiomarkers})
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      filterCategory === cat
                        ? 'btn-primary-visible'
                        : 'bg-slate-100 dark:bg-emerald-950/40 text-slate-600 dark:text-emerald-200/70 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-emerald-900/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Biomarker Items List */}
            <div className="space-y-3">
              {totalBiomarkers === 0 ? (
                <div className="p-8 rounded-3xl bg-slate-50 dark:bg-[#031f17] border border-dashed border-slate-300 dark:border-emerald-900/40 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-base font-extrabold">No Biomarkers Detected</h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-emerald-200/70">
                      The uploaded file didn&apos;t yield text streams (e.g. flat scanned image PDF). You can add biomarkers manually or load a standard panel below.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleAddCustomBiomarker}
                      className="px-4 py-2 rounded-xl btn-primary-visible text-xs font-extrabold cursor-pointer"
                    >
                      + Add Biomarker Manually
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadPresetPanel('full')}
                      className="px-4 py-2 rounded-xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
                    >
                      🌟 Load Full Health Panel
                    </button>
                  </div>
                </div>
              ) : displayedBiomarkers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#031f17] border border-slate-200 dark:border-emerald-900/30 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-500">No biomarkers match your search or filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCategory('all');
                      setSearchQuery('');
                    }}
                    className="text-xs font-extrabold text-emerald-500 hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                displayedBiomarkers.map((t) => (
                  <div
                    key={t.id || t.originalIndex}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      t.isAbnormal
                        ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-slate-50 dark:bg-[#031f17] border-slate-200 dark:border-emerald-900/30 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-emerald-950/70 text-slate-600 dark:text-emerald-300 border border-slate-300/40 dark:border-emerald-800/40">
                        {t.category || 'General Health'}
                      </span>
                      {t.isAbnormal && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Flagged Outside Normal Range
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-bold items-center">
                      {/* Test Name */}
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Test / Biomarker Name</label>
                        <input
                          type="text"
                          value={t.testName}
                          onChange={(e) => handleUpdateBiomarkerField(t.originalIndex, 'testName', e.target.value)}
                          className="w-full rounded-xl px-3 py-1.5 text-xs font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-emerald-900/40 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Value & Unit */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Value &amp; Unit</label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={t.value}
                            onChange={(e) =>
                              handleUpdateBiomarkerField(t.originalIndex, 'value', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-emerald-900/40 outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={t.unit}
                            onChange={(e) => handleUpdateBiomarkerField(t.originalIndex, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="flex-1 min-w-0 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-emerald-900/40 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Reference Range */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Reference Range</label>
                        <input
                          type="text"
                          value={t.referenceRange || ''}
                          onChange={(e) => handleUpdateBiomarkerField(t.originalIndex, 'referenceRange', e.target.value)}
                          placeholder="e.g. 70 - 100"
                          className="w-full rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-emerald-900/40 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Status Toggle & Delete */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleUpdateBiomarkerField(t.originalIndex, 'isAbnormal', !t.isAbnormal)}
                          title="Click to toggle Normal / Abnormal status"
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer border transition-all flex items-center gap-1 ${
                            t.isAbnormal
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          }`}
                        >
                          {t.isAbnormal ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Abnormal</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Normal</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveBiomarker(t.originalIndex)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remove this biomarker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 dark:border-emerald-900/30 gap-3">
              <button
                type="button"
                onClick={() => {
                  setParsedReport(null);
                  setCustomText('');
                  setRawPdfText('');
                  setShowRawText(false);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
              >
                Re-upload File
              </button>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSaveToHistory}
                  disabled={parsedReport.testResults.length === 0}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl btn-secondary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Save to Report History</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReport}
                  disabled={parsedReport.testResults.length === 0}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <span>Compare in Analytics ({parsedReport.testResults.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
