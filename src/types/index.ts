export type AdherenceStatus = 'taken' | 'ignored' | 'missed' | 'pending';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  streakDays: number;
}

export interface ExtractedMedicine {
  id?: string;
  name: string;
  strength: string;
  dose: string;
  frequency: string;
  timing: string;
  duration_days: number;
  confidence: number;
  needs_review: boolean;
  review_reason?: string;
}

export interface Prescription {
  id: string;
  filename: string;
  doctorName: string;
  date: string;
  medicines: ExtractedMedicine[];
  ambiguousCount: number;
  notes: string;
  uploadedAt: string;
}

export interface MedicineScheduleItem {
  id: string;
  prescriptionId?: string;
  name: string;
  dosage: string;
  time: string; // e.g. "09:00 AM"
  timeCategory: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  timingInstruction: string; // "After food", "Before food"
  durationDays: number;
  remainingDays: number;
  startDate: string;
  active: boolean;
}

export interface AdherenceLog {
  id: string;
  scheduleId: string;
  medicineName: string;
  status: AdherenceStatus;
  timestamp: string; // ISO date string or formatted time e.g., "09:05 AM"
  scheduledTime: string;
  date: string; // YYYY-MM-DD
}

export interface ExtractedTestResult {
  id: string;
  testName: string;
  value: number;
  unit: string;
  referenceRange?: string;
  category: string;
  isAbnormal: boolean;
  notes?: string;
}

export interface MedicalReport {
  id: string;
  filename: string;
  labName: string;
  reportDate: string; // YYYY-MM-DD
  testResults: ExtractedTestResult[];
  summary: string;
  uploadedAt: string;
}

export interface HealthComparisonItem {
  testName: string;
  unit: string;
  previousValue: number;
  currentValue: number;
  changePercentage: number;
  status: 'improved' | 'worsened' | 'stable' | 'needs_review';
  explanation: string;
  referenceRange?: string;
}

export interface HealthComparisonReport {
  reportIdPrev: string;
  reportIdCurr: string;
  datePrev: string;
  dateCurr: string;
  overallSummary: string;
  items: HealthComparisonItem[];
}
