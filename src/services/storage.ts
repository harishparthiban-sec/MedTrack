import type {
  UserProfile,
  Prescription,
  MedicineScheduleItem,
  AdherenceLog,
  MedicalReport,
} from '../types';

const KEYS = {
  USER: 'medtrack_user_prod',
  TOKEN: 'medtrack_token_prod',
  PRESCRIPTIONS: 'medtrack_prescriptions_prod',
  SCHEDULES: 'medtrack_schedules_prod',
  LOGS: 'medtrack_logs_prod',
  REPORTS: 'medtrack_reports_prod',
  COMPARISON: 'medtrack_comparison_prod',
};

// Retrieve stored user (null if not logged in)
export const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredUser = (user: UserProfile | null) => {
  if (!user) {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.TOKEN);
  } else {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }
};

// Prescriptions (default empty array [])
export const getStoredPrescriptions = (): Prescription[] => {
  try {
    const raw = localStorage.getItem(KEYS.PRESCRIPTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredPrescriptions = (prescriptions: Prescription[]) => {
  localStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
};

// Schedules (default empty array [])
export const getStoredSchedules = (): MedicineScheduleItem[] => {
  try {
    const raw = localStorage.getItem(KEYS.SCHEDULES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredSchedules = (schedules: MedicineScheduleItem[]) => {
  localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(schedules));
};

// Adherence Logs (default empty array [])
export const getStoredLogs = (): AdherenceLog[] => {
  try {
    const raw = localStorage.getItem(KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredLogs = (logs: AdherenceLog[]) => {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
};

// Medical Reports (default empty array [])
export const getStoredReports = (): MedicalReport[] => {
  try {
    const raw = localStorage.getItem(KEYS.REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredReports = (reports: MedicalReport[]) => {
  localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
};

// Clear all data for logout
export const clearUserStorage = () => {
  localStorage.removeItem(KEYS.USER);
  localStorage.removeItem(KEYS.TOKEN);
  localStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify([]));
  localStorage.setItem(KEYS.SCHEDULES, JSON.stringify([]));
  localStorage.setItem(KEYS.LOGS, JSON.stringify([]));
  localStorage.setItem(KEYS.REPORTS, JSON.stringify([]));
  localStorage.removeItem(KEYS.COMPARISON);
};
