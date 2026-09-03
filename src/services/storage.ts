import type {
  UserProfile,
  Prescription,
  MedicineScheduleItem,
  AdherenceLog,
  MedicalReport,
} from '../types';

const GLOBAL_KEYS = {
  CURRENT_USER: 'medtrack_user_prod',
  TOKEN: 'medtrack_token_prod',
  // Legacy global keys (migrated once to the original user's isolated store)
  LEGACY_PRESCRIPTIONS: 'medtrack_prescriptions_prod',
  LEGACY_SCHEDULES: 'medtrack_schedules_prod',
  LEGACY_LOGS: 'medtrack_logs_prod',
  LEGACY_REPORTS: 'medtrack_reports_prod',
  LEGACY_MIGRATED_USER: 'medtrack_legacy_migrated_user',
};

/**
 * Creates an isolated storage key scoped to a specific user.
 * Ensures complete multi-account data segregation so each user
 * only sees their own reports, prescriptions, and schedules.
 */
const getUserKey = (userId: string | undefined, suffix: string): string => {
  if (!userId) return `medtrack_anon_${suffix}`;
  const safeId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `medtrack_u_${safeId}_${suffix}`;
};

// Retrieve stored active user (null if not logged in)
export const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(GLOBAL_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredUser = (user: UserProfile | null) => {
  if (!user) {
    localStorage.removeItem(GLOBAL_KEYS.CURRENT_USER);
    localStorage.removeItem(GLOBAL_KEYS.TOKEN);
  } else {
    localStorage.setItem(GLOBAL_KEYS.CURRENT_USER, JSON.stringify(user));
  }
};

// Prescriptions (scoped per user)
export const getStoredPrescriptions = (userId?: string): Prescription[] => {
  if (!userId) return [];
  try {
    const key = getUserKey(userId, 'prescriptions');
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // One-time legacy migration check: only migrate if this was the original user
    const migratedUser = localStorage.getItem(GLOBAL_KEYS.LEGACY_MIGRATED_USER);
    if (!migratedUser) {
      const legacy = localStorage.getItem(GLOBAL_KEYS.LEGACY_PRESCRIPTIONS);
      if (legacy) {
        localStorage.setItem(GLOBAL_KEYS.LEGACY_MIGRATED_USER, userId);
        localStorage.setItem(key, legacy);
        return JSON.parse(legacy);
      }
    }
    return [];
  } catch {
    return [];
  }
};

export const saveStoredPrescriptions = (userId: string | undefined, prescriptions: Prescription[]) => {
  if (!userId) return;
  try {
    const key = getUserKey(userId, 'prescriptions');
    localStorage.setItem(key, JSON.stringify(prescriptions));
  } catch (err) {
    console.error('Failed to save user prescriptions', err);
  }
};

// Schedules (scoped per user)
export const getStoredSchedules = (userId?: string): MedicineScheduleItem[] => {
  if (!userId) return [];
  try {
    const key = getUserKey(userId, 'schedules');
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    const migratedUser = localStorage.getItem(GLOBAL_KEYS.LEGACY_MIGRATED_USER);
    if (migratedUser === userId) {
      const legacy = localStorage.getItem(GLOBAL_KEYS.LEGACY_SCHEDULES);
      if (legacy) {
        localStorage.setItem(key, legacy);
        return JSON.parse(legacy);
      }
    }
    return [];
  } catch {
    return [];
  }
};

export const saveStoredSchedules = (userId: string | undefined, schedules: MedicineScheduleItem[]) => {
  if (!userId) return;
  try {
    const key = getUserKey(userId, 'schedules');
    localStorage.setItem(key, JSON.stringify(schedules));
  } catch (err) {
    console.error('Failed to save user schedules', err);
  }
};

// Adherence Logs (scoped per user)
export const getStoredLogs = (userId?: string): AdherenceLog[] => {
  if (!userId) return [];
  try {
    const key = getUserKey(userId, 'logs');
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    const migratedUser = localStorage.getItem(GLOBAL_KEYS.LEGACY_MIGRATED_USER);
    if (migratedUser === userId) {
      const legacy = localStorage.getItem(GLOBAL_KEYS.LEGACY_LOGS);
      if (legacy) {
        localStorage.setItem(key, legacy);
        return JSON.parse(legacy);
      }
    }
    return [];
  } catch {
    return [];
  }
};

export const saveStoredLogs = (userId: string | undefined, logs: AdherenceLog[]) => {
  if (!userId) return;
  try {
    const key = getUserKey(userId, 'logs');
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save user logs', err);
  }
};

// Medical Reports (scoped per user)
export const getStoredReports = (userId?: string): MedicalReport[] => {
  if (!userId) return [];
  try {
    const key = getUserKey(userId, 'reports');
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    const migratedUser = localStorage.getItem(GLOBAL_KEYS.LEGACY_MIGRATED_USER);
    if (migratedUser === userId) {
      const legacy = localStorage.getItem(GLOBAL_KEYS.LEGACY_REPORTS);
      if (legacy) {
        localStorage.setItem(key, legacy);
        return JSON.parse(legacy);
      }
    }
    return [];
  } catch {
    return [];
  }
};

export const saveStoredReports = (userId: string | undefined, reports: MedicalReport[]) => {
  if (!userId) return;
  try {
    const key = getUserKey(userId, 'reports');
    localStorage.setItem(key, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save user reports', err);
  }
};

// Clear active session (Logout - does not touch user's stored records)
export const clearUserStorage = () => {
  localStorage.removeItem(GLOBAL_KEYS.CURRENT_USER);
  localStorage.removeItem(GLOBAL_KEYS.TOKEN);
};

// Clear data specifically for the current user (e.g. Account Reset Data)
export const resetCurrentUserData = (userId?: string) => {
  if (!userId) return;
  try {
    localStorage.removeItem(getUserKey(userId, 'prescriptions'));
    localStorage.removeItem(getUserKey(userId, 'schedules'));
    localStorage.removeItem(getUserKey(userId, 'logs'));
    localStorage.removeItem(getUserKey(userId, 'reports'));
    localStorage.removeItem(getUserKey(userId, 'comparison'));
  } catch (err) {
    console.error('Failed to reset user data', err);
  }
};
