import type { ExtractedMedicine, MedicineScheduleItem, ExtractedTestResult, MedicalReport } from '../types';

export const parsePrescriptionClient = async (
  filename: string,
  rawText?: string
): Promise<{
  doctorName: string;
  date: string;
  medicines: ExtractedMedicine[];
  ambiguousCount: number;
  notes: string;
}> => {
  // Simulate intelligent AI scanning latency
  await new Promise((res) => setTimeout(res, 1200));

  const textToScan = rawText || filename.toLowerCase();

  // Preset smart extractions based on common inputs or default scanned rx
  const defaultMedicines: ExtractedMedicine[] = [
    {
      id: 'med-' + Math.random().toString(36).substr(2, 6),
      name: 'Metformin',
      strength: '500 mg',
      dose: '1 tablet',
      frequency: 'Twice daily',
      timing: 'After food',
      duration_days: 30,
      confidence: 0.96,
      needs_review: false,
    },
    {
      id: 'med-' + Math.random().toString(36).substr(2, 6),
      name: 'Atorvastatin',
      strength: '10 mg',
      dose: '1 tablet',
      frequency: 'Once daily (Night)',
      timing: 'After food',
      duration_days: 30,
      confidence: 0.91,
      needs_review: false,
    },
    {
      id: 'med-' + Math.random().toString(36).substr(2, 6),
      name: 'Pantoprazole',
      strength: '40 mg',
      dose: '1 tablet',
      frequency: 'Once daily (Morning)',
      timing: 'Before food',
      duration_days: 14,
      confidence: 0.68,
      needs_review: true,
      review_reason: 'Duration notation ambiguous on rx (14 days vs 4 weeks). Please verify.',
    },
  ];

  if (textToScan.includes('paracetamol') || textToScan.includes('fever')) {
    defaultMedicines.unshift({
      id: 'med-' + Math.random().toString(36).substr(2, 6),
      name: 'Paracetamol',
      strength: '650 mg',
      dose: '1 tablet',
      frequency: 'Three times daily',
      timing: 'After food',
      duration_days: 5,
      confidence: 0.99,
      needs_review: false,
    });
  }

  const ambiguousCount = defaultMedicines.filter((m) => m.needs_review).length;

  return {
    doctorName: 'Dr. A. R. Varma, MD (Internal Medicine)',
    date: new Date().toISOString().split('T')[0],
    medicines: defaultMedicines,
    ambiguousCount,
    notes: 'Prescription OCR completed. AI identified ' + defaultMedicines.length + ' medication instructions.',
  };
};

export const generateSchedulesFromMedicines = (
  medicines: ExtractedMedicine[],
  prescriptionId: string
): MedicineScheduleItem[] => {
  const schedules: MedicineScheduleItem[] = [];

  medicines.forEach((med) => {
    const freq = med.frequency.toLowerCase();

    if (freq.includes('twice') || freq.includes('2')) {
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '09:00 AM',
        timeCategory: 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '09:00 PM',
        timeCategory: 'Night',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    } else if (freq.includes('three') || freq.includes('3') || freq.includes('tid')) {
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '08:00 AM',
        timeCategory: 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '02:00 PM',
        timeCategory: 'Afternoon',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: '08:00 PM',
        timeCategory: 'Night',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    } else {
      // Default Once daily
      const isNight = freq.includes('night');
      schedules.push({
        id: 'sch-' + Math.random().toString(36).substr(2, 7),
        prescriptionId,
        name: med.name,
        dosage: `${med.strength} (${med.dose})`,
        time: isNight ? '09:00 PM' : '08:00 AM',
        timeCategory: isNight ? 'Night' : 'Morning',
        timingInstruction: med.timing,
        durationDays: med.duration_days,
        remainingDays: med.duration_days,
        startDate: new Date().toISOString().split('T')[0],
        active: true,
      });
    }
  });

  return schedules;
};

export const parseLabReportClient = async (
  filename: string,
  _rawText?: string
): Promise<MedicalReport> => {
  await new Promise((res) => setTimeout(res, 1400));

  const sampleResults: ExtractedTestResult[] = [
    { id: 'tr-' + Math.random(), testName: 'HbA1c (Glycated Hemoglobin)', value: 6.2, unit: '%', referenceRange: '4.0 - 5.6', category: 'Diabetes', isAbnormal: true },
    { id: 'tr-' + Math.random(), testName: 'Vitamin D (25-OH)', value: 34.5, unit: 'ng/mL', referenceRange: '30.0 - 100.0', category: 'Vitamins', isAbnormal: false },
    { id: 'tr-' + Math.random(), testName: 'LDL Cholesterol', value: 128.0, unit: 'mg/dL', referenceRange: '< 100.0', category: 'Lipid Profile', isAbnormal: true },
    { id: 'tr-' + Math.random(), testName: 'Fasting Blood Sugar', value: 104.0, unit: 'mg/dL', referenceRange: '70.0 - 99.0', category: 'Diabetes', isAbnormal: true },
    { id: 'tr-' + Math.random(), testName: 'TSH (Thyroid Stimulating)', value: 2.2, unit: 'uIU/mL', referenceRange: '0.4 - 4.2', category: 'Thyroid', isAbnormal: false },
    { id: 'tr-' + Math.random(), testName: 'Serum Creatinine', value: 0.88, unit: 'mg/dL', referenceRange: '0.6 - 1.2', category: 'Kidney Function', isAbnormal: false },
  ];

  return {
    id: 'rep-' + Math.random().toString(36).substr(2, 6),
    filename,
    labName: 'Apollo Diagnostics Laboratory',
    reportDate: new Date().toISOString().split('T')[0],
    testResults: sampleResults,
    summary: '6 blood biomarkers scanned. HbA1c shows continued positive response to medication.',
    uploadedAt: new Date().toISOString(),
  };
};
