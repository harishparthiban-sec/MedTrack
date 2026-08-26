import type {
  UserProfile,
  Prescription,
  MedicineScheduleItem,
  AdherenceLog,
  MedicalReport,
  HealthComparisonReport,
} from '../types';

export const initialUser: UserProfile = {
  id: 'usr-1',
  name: 'Harish Kumar',
  email: 'harish.k@example.com',
  streakDays: 7,
};

export const initialPrescriptions: Prescription[] = [
  {
    id: 'rx-101',
    filename: 'Prescription_Dr_Sharma_Aug20.pdf',
    doctorName: 'Dr. S. K. Sharma (Cardiologist)',
    date: '2026-08-20',
    medicines: [
      {
        id: 'med-1',
        name: 'Paracetamol',
        strength: '500 mg',
        dose: '1 tablet',
        frequency: 'Twice daily',
        timing: 'After food',
        duration_days: 5,
        confidence: 0.98,
        needs_review: false,
      },
      {
        id: 'med-2',
        name: 'Vitamin D3',
        strength: '60000 IU',
        dose: '1 capsule',
        frequency: 'Once weekly',
        timing: 'After food',
        duration_days: 30,
        confidence: 0.94,
        needs_review: false,
      },
      {
        id: 'med-3',
        name: 'Amoxicillin',
        strength: '500 mg',
        dose: '1 capsule',
        frequency: 'Twice daily',
        timing: 'After food',
        duration_days: 7,
        confidence: 0.72,
        needs_review: true,
        review_reason: 'Dosage frequency handwritten as 1-0-1 or 1-0-0. Please confirm with prescription image.',
      },
    ],
    ambiguousCount: 1,
    notes: 'Prescription auto-extracted with MedTrack AI. Flagged 1 ambiguous item for user verification.',
    uploadedAt: '2026-08-20T10:30:00Z',
  },
];

export const initialSchedules: MedicineScheduleItem[] = [
  {
    id: 'sch-1',
    prescriptionId: 'rx-101',
    name: 'Vitamin D3',
    dosage: '60,000 IU (1 capsule)',
    time: '08:00 AM',
    timeCategory: 'Morning',
    timingInstruction: 'After breakfast',
    durationDays: 30,
    remainingDays: 24,
    startDate: '2026-08-20',
    active: true,
  },
  {
    id: 'sch-2',
    prescriptionId: 'rx-101',
    name: 'Paracetamol',
    dosage: '500 mg (1 tablet)',
    time: '09:00 AM',
    timeCategory: 'Morning',
    timingInstruction: 'After food',
    durationDays: 5,
    remainingDays: 2,
    startDate: '2026-08-20',
    active: true,
  },
  {
    id: 'sch-3',
    prescriptionId: 'rx-101',
    name: 'Amoxicillin',
    dosage: '500 mg (1 capsule)',
    time: '02:00 PM',
    timeCategory: 'Afternoon',
    timingInstruction: 'After lunch',
    durationDays: 7,
    remainingDays: 4,
    startDate: '2026-08-20',
    active: true,
  },
  {
    id: 'sch-4',
    prescriptionId: 'rx-101',
    name: 'Paracetamol',
    dosage: '500 mg (1 tablet)',
    time: '09:00 PM',
    timeCategory: 'Night',
    timingInstruction: 'After dinner',
    durationDays: 5,
    remainingDays: 2,
    startDate: '2026-08-20',
    active: true,
  },
];

// Helper to generate recent adherence dates (past 14 days)
const today = new Date();
const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

const generateRecentLogs = (): AdherenceLog[] => {
  const logs: AdherenceLog[] = [];
  
  // Past 14 days history
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateKey(d);

    if (i === 3 || i === 9) {
      // Partially taken day (Yellow)
      logs.push(
        { id: `log-${i}-1`, scheduleId: 'sch-1', medicineName: 'Vitamin D3', status: 'taken', timestamp: '08:10 AM', scheduledTime: '08:00 AM', date: dateStr },
        { id: `log-${i}-2`, scheduleId: 'sch-2', medicineName: 'Paracetamol', status: 'ignored', timestamp: '09:45 AM', scheduledTime: '09:00 AM', date: dateStr },
        { id: `log-${i}-3`, scheduleId: 'sch-4', medicineName: 'Paracetamol', status: 'taken', timestamp: '09:15 PM', scheduledTime: '09:00 PM', date: dateStr }
      );
    } else if (i === 6) {
      // Skipped day (Red)
      logs.push(
        { id: `log-${i}-1`, scheduleId: 'sch-1', medicineName: 'Vitamin D3', status: 'ignored', timestamp: '08:40 AM', scheduledTime: '08:00 AM', date: dateStr },
        { id: `log-${i}-2`, scheduleId: 'sch-2', medicineName: 'Paracetamol', status: 'ignored', timestamp: '09:30 AM', scheduledTime: '09:00 AM', date: dateStr },
        { id: `log-${i}-3`, scheduleId: 'sch-4', medicineName: 'Paracetamol', status: 'missed', timestamp: '11:00 PM', scheduledTime: '09:00 PM', date: dateStr }
      );
    } else {
      // 100% Taken day (Green)
      logs.push(
        { id: `log-${i}-1`, scheduleId: 'sch-1', medicineName: 'Vitamin D3', status: 'taken', timestamp: '08:05 AM', scheduledTime: '08:00 AM', date: dateStr },
        { id: `log-${i}-2`, scheduleId: 'sch-2', medicineName: 'Paracetamol', status: 'taken', timestamp: '09:02 AM', scheduledTime: '09:00 AM', date: dateStr },
        { id: `log-${i}-3`, scheduleId: 'sch-3', medicineName: 'Amoxicillin', status: 'taken', timestamp: '02:15 PM', scheduledTime: '02:00 PM', date: dateStr },
        { id: `log-${i}-4`, scheduleId: 'sch-4', medicineName: 'Paracetamol', status: 'taken', timestamp: '09:10 PM', scheduledTime: '09:00 PM', date: dateStr }
      );
    }
  }

  // Today's logs (1 taken, 3 pending)
  const todayStr = formatDateKey(today);
  logs.push({
    id: 'log-today-1',
    scheduleId: 'sch-1',
    medicineName: 'Vitamin D3',
    status: 'taken',
    timestamp: '08:04 AM',
    scheduledTime: '08:00 AM',
    date: todayStr,
  });

  return logs;
};

export const initialAdherenceLogs: AdherenceLog[] = generateRecentLogs();

export const initialMedicalReports: MedicalReport[] = [
  {
    id: 'rep-May2026',
    filename: 'Blood_Panel_May_2026.pdf',
    labName: 'Metropolis Diagnostics Center',
    reportDate: '2026-05-15',
    summary: 'Baseline comprehensive blood metabolic and lipid test panel.',
    uploadedAt: '2026-05-15T14:20:00Z',
    testResults: [
      { id: 'tr-101', testName: 'HbA1c (Glycated Hemoglobin)', value: 7.2, unit: '%', referenceRange: '4.0 - 5.6', category: 'Diabetes', isAbnormal: true },
      { id: 'tr-102', testName: 'Vitamin D (25-OH)', value: 15.0, unit: 'ng/mL', referenceRange: '30.0 - 100.0', category: 'Vitamins', isAbnormal: true },
      { id: 'tr-103', testName: 'LDL Cholesterol', value: 110.0, unit: 'mg/dL', referenceRange: '< 100.0', category: 'Lipid Profile', isAbnormal: true },
      { id: 'tr-104', testName: 'Fasting Blood Sugar', value: 135.0, unit: 'mg/dL', referenceRange: '70.0 - 99.0', category: 'Diabetes', isAbnormal: true },
      { id: 'tr-105', testName: 'TSH (Thyroid Stimulating)', value: 2.3, unit: 'uIU/mL', referenceRange: '0.4 - 4.2', category: 'Thyroid', isAbnormal: false },
      { id: 'tr-106', testName: 'Serum Creatinine', value: 0.95, unit: 'mg/dL', referenceRange: '0.6 - 1.2', category: 'Kidney Function', isAbnormal: false },
    ],
  },
  {
    id: 'rep-Aug2026',
    filename: 'Blood_Panel_Aug_2026.pdf',
    labName: 'Metropolis Diagnostics Center',
    reportDate: '2026-08-22',
    summary: '3-Month Follow-Up metabolic checkup report after medication treatment.',
    uploadedAt: '2026-08-22T09:15:00Z',
    testResults: [
      { id: 'tr-201', testName: 'HbA1c (Glycated Hemoglobin)', value: 6.5, unit: '%', referenceRange: '4.0 - 5.6', category: 'Diabetes', isAbnormal: true },
      { id: 'tr-202', testName: 'Vitamin D (25-OH)', value: 28.0, unit: 'ng/mL', referenceRange: '30.0 - 100.0', category: 'Vitamins', isAbnormal: false },
      { id: 'tr-203', testName: 'LDL Cholesterol', value: 145.0, unit: 'mg/dL', referenceRange: '< 100.0', category: 'Lipid Profile', isAbnormal: true },
      { id: 'tr-204', testName: 'Fasting Blood Sugar', value: 112.0, unit: 'mg/dL', referenceRange: '70.0 - 99.0', category: 'Diabetes', isAbnormal: true },
      { id: 'tr-205', testName: 'TSH (Thyroid Stimulating)', value: 2.4, unit: 'uIU/mL', referenceRange: '0.4 - 4.2', category: 'Thyroid', isAbnormal: false },
      { id: 'tr-206', testName: 'Serum Creatinine', value: 0.91, unit: 'mg/dL', referenceRange: '0.6 - 1.2', category: 'Kidney Function', isAbnormal: false },
    ],
  },
];

export const initialComparisonReport: HealthComparisonReport = {
  reportIdPrev: 'rep-May2026',
  reportIdCurr: 'rep-Aug2026',
  datePrev: '2026-05-15',
  dateCurr: '2026-08-22',
  overallSummary: 'HbA1c and Vitamin D levels show noticeable improvement following 3 months of adherence. LDL Cholesterol has risen and warrants dietary or clinical review. Always consult your physician regarding significant laboratory shifts.',
  items: [
    {
      testName: 'HbA1c (Glycated Hemoglobin)',
      unit: '%',
      previousValue: 7.2,
      currentValue: 6.5,
      changePercentage: -9.7,
      status: 'improved',
      explanation: 'Your HbA1c level improved significantly from 7.2% down to 6.5% (a 9.7% reduction towards normal glycemic target).',
      referenceRange: '4.0 - 5.6',
    },
    {
      testName: 'Vitamin D (25-OH)',
      unit: 'ng/mL',
      previousValue: 15.0,
      currentValue: 28.0,
      changePercentage: 86.7,
      status: 'improved',
      explanation: 'Your Vitamin D level improved dramatically from 15.0 to 28.0 ng/mL (+86.7% increase, approaching optimal range).',
      referenceRange: '30.0 - 100.0',
    },
    {
      testName: 'Fasting Blood Sugar',
      unit: 'mg/dL',
      previousValue: 135.0,
      currentValue: 112.0,
      changePercentage: -17.0,
      status: 'improved',
      explanation: 'Fasting Glucose improved from 135 to 112 mg/dL (-17.0% decrease).',
      referenceRange: '70.0 - 99.0',
    },
    {
      testName: 'LDL Cholesterol',
      unit: 'mg/dL',
      previousValue: 110.0,
      currentValue: 145.0,
      changePercentage: 31.8,
      status: 'worsened',
      explanation: 'LDL Cholesterol increased from 110 to 145 mg/dL (+31.8% increase). Needs clinical attention and lifestyle evaluation.',
      referenceRange: '< 100.0',
    },
    {
      testName: 'TSH (Thyroid Stimulating)',
      unit: 'uIU/mL',
      previousValue: 2.3,
      currentValue: 2.4,
      changePercentage: 4.3,
      status: 'stable',
      explanation: 'Thyroid function remains stable within target limits (2.3 vs 2.4 uIU/mL).',
      referenceRange: '0.4 - 4.2',
    },
  ],
};
