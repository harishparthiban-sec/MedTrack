import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { UploadCenter } from './components/UploadCenter';
import { MedicineSchedule } from './components/MedicineSchedule';
import { AdherenceCalendar } from './components/AdherenceCalendar';
import { HealthReportComparison } from './components/HealthReportComparison';
import { ReportsHistory } from './components/ReportsHistory';
import { ReminderModal } from './components/ReminderModal';
import { AuthScreen } from './components/AuthScreen';
import { AccountModal } from './components/AccountModal';

import {
  getStoredUser,
  saveStoredUser,
  getStoredPrescriptions,
  saveStoredPrescriptions,
  getStoredSchedules,
  saveStoredSchedules,
  getStoredLogs,
  saveStoredLogs,
  getStoredReports,
  saveStoredReports,
  clearUserStorage,
  resetCurrentUserData,
} from './services/storage';

import { requestNotificationPermission, parseTimeToMinutes } from './services/notifications';
import { calculateAdherenceStreak } from './services/adherence';

import type {
  UserProfile,
  Prescription,
  MedicineScheduleItem,
  AdherenceLog,
  MedicalReport,
  HealthComparisonReport,
} from './types';
import { computeHealthComparison } from './services/aiHealthComparison';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('medtrack_theme') as 'dark' | 'light') || 'dark'
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Application Persistent States - strictly isolated per user account
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() =>
    user ? getStoredPrescriptions(user.id) : []
  );
  const [schedules, setSchedules] = useState<MedicineScheduleItem[]>(() =>
    user ? getStoredSchedules(user.id) : []
  );
  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>(() =>
    user ? getStoredLogs(user.id) : []
  );
  const [reports, setReports] = useState<MedicalReport[]>(() =>
    user ? getStoredReports(user.id) : []
  );
  const [comparisonReport, setComparisonReport] = useState<HealthComparisonReport | null>(null);

  // Track the active user ID loaded into state to avoid cross-user data bleeding
  const activeUserIdRef = useRef<string | null>(user?.id || null);

  // Reminder Popup State
  const [activeReminder, setActiveReminder] = useState<MedicineScheduleItem | null>(null);
  const [reminderQueue, setReminderQueue] = useState<MedicineScheduleItem[]>([]);
  const snoozedUntilRef = useRef<Record<string, number>>({});
  const dismissedSessionRef = useRef<Set<string>>(new Set());

  const todayStr = new Date().toISOString().split('T')[0];
  const currentStreak = calculateAdherenceStreak(adherenceLogs);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('medtrack_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // When user switches or logs in/out, load ONLY that user's isolated data
  useEffect(() => {
    const currentId = user?.id || null;
    activeUserIdRef.current = currentId;

    if (currentId) {
      setPrescriptions(getStoredPrescriptions(currentId));
      setSchedules(getStoredSchedules(currentId));
      setAdherenceLogs(getStoredLogs(currentId));
      setReports(getStoredReports(currentId));
    } else {
      setPrescriptions([]);
      setSchedules([]);
      setAdherenceLogs([]);
      setReports([]);
      setComparisonReport(null);
    }
  }, [user?.id]);

  // Background real-time timer checking for scheduled medicine times
  useEffect(() => {
    if (!user || schedules.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const activeSchedulesList = schedules.filter((s) => s.active);
      const todayLoggedSet = new Set(
        adherenceLogs.filter((l) => l.date === todayStr).map((l) => l.scheduleId)
      );

      const nowMs = Date.now();
      const dueSchedules = activeSchedulesList.filter((s) => {
        if (todayLoggedSet.has(s.id)) return false;
        const snoozedUntil = snoozedUntilRef.current[s.id];
        if (snoozedUntil && nowMs < snoozedUntil) return false;
        if (dismissedSessionRef.current.has(s.id)) return false;

        const schedMinutes = parseTimeToMinutes(s.time);
        // Due if current time is within 15 minutes before scheduled time or overdue earlier today
        return currentMinutes >= schedMinutes - 15;
      });

      if (dueSchedules.length > 0) {
        setReminderQueue(dueSchedules);
        setActiveReminder((prev) => {
          if (prev && dueSchedules.some((item) => item.id === prev.id)) return prev;
          return dueSchedules[0];
        });
      }
    };

    // Run check immediately on mount/update
    checkReminders();

    const intervalId = setInterval(checkReminders, 20000);
    return () => clearInterval(intervalId);
  }, [user, schedules, adherenceLogs, todayStr]);

  // Re-compute comparison report when reports state changes
  useEffect(() => {
    if (reports.length >= 2) {
      const sorted = [...reports].sort((a, b) => (a.reportDate || '').localeCompare(b.reportDate || ''));
      const baseline = sorted[0];
      const followUp = sorted[sorted.length - 1];
      const comp = computeHealthComparison(baseline, followUp);
      setComparisonReport(comp);
    } else {
      setComparisonReport(null);
    }
  }, [reports]);

  // Persist state updates strictly scoped to active user
  useEffect(() => {
    saveStoredUser(user);
  }, [user]);

  useEffect(() => {
    if (user?.id && activeUserIdRef.current === user.id) {
      saveStoredPrescriptions(user.id, prescriptions);
    }
  }, [user?.id, prescriptions]);

  useEffect(() => {
    if (user?.id && activeUserIdRef.current === user.id) {
      saveStoredSchedules(user.id, schedules);
    }
  }, [user?.id, schedules]);

  useEffect(() => {
    if (user?.id && activeUserIdRef.current === user.id) {
      saveStoredLogs(user.id, adherenceLogs);
    }
  }, [user?.id, adherenceLogs]);

  useEffect(() => {
    if (user?.id && activeUserIdRef.current === user.id) {
      saveStoredReports(user.id, reports);
    }
  }, [user?.id, reports]);

  // If unauthenticated, show Full Auth Screen Landing Page
  if (!user) {
    return (
      <AuthScreen
        onLoginSuccess={(loggedInUser) => {
          activeUserIdRef.current = loggedInUser.id;
          setPrescriptions(getStoredPrescriptions(loggedInUser.id));
          setSchedules(getStoredSchedules(loggedInUser.id));
          setAdherenceLogs(getStoredLogs(loggedInUser.id));
          setReports(getStoredReports(loggedInUser.id));
          setUser(loggedInUser);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // Count pending today
  const activeSchedules = schedules.filter((s) => s.active);
  const todayLogs = adherenceLogs.filter((l) => l.date === todayStr);
  const loggedScheduleIds = new Set(todayLogs.map((l) => l.scheduleId));
  const pendingCount = activeSchedules.filter((s) => !loggedScheduleIds.has(s.id)).length;

  // Log Taken / Ignored Action
  const handleLogAction = (scheduleId: string, status: 'taken' | 'ignored') => {
    const targetSchedule = schedules.find((s) => s.id === scheduleId);
    if (!targetSchedule) return;

    const timeFormatted = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newLog: AdherenceLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 7),
      scheduleId,
      medicineName: targetSchedule.name,
      status,
      timestamp: timeFormatted,
      scheduledTime: targetSchedule.time,
      date: todayStr,
    };

    setAdherenceLogs((prev) => [
      ...prev.filter((l) => !(l.scheduleId === scheduleId && l.date === todayStr)),
      newLog,
    ]);

    // If active reminder is this item, advance queue or close
    setReminderQueue((prev) => {
      const nextQueue = prev.filter((item) => item.id !== scheduleId);
      if (activeReminder?.id === scheduleId) {
        setActiveReminder(nextQueue[0] || null);
      }
      return nextQueue;
    });
  };

  const handleSnoozeReminder = (scheduleId: string, minutes: number = 10) => {
    snoozedUntilRef.current[scheduleId] = Date.now() + minutes * 60 * 1000;
    setReminderQueue((prev) => {
      const nextQueue = prev.filter((item) => item.id !== scheduleId);
      if (activeReminder?.id === scheduleId) {
        setActiveReminder(nextQueue[0] || null);
      }
      return nextQueue;
    });
  };

  const handleDismissReminder = () => {
    if (activeReminder) {
      dismissedSessionRef.current.add(activeReminder.id);
    }
    setActiveReminder(null);
  };

  const handleTriggerReminder = (targetItem?: MedicineScheduleItem) => {
    if (targetItem) {
      delete snoozedUntilRef.current[targetItem.id];
      dismissedSessionRef.current.delete(targetItem.id);
      setActiveReminder(targetItem);
      setReminderQueue([targetItem]);
      return;
    }

    const todayLoggedSet = new Set(
      adherenceLogs.filter((l) => l.date === todayStr).map((l) => l.scheduleId)
    );
    const pending = schedules.filter((s) => s.active && !todayLoggedSet.has(s.id));

    if (pending.length > 0) {
      delete snoozedUntilRef.current[pending[0].id];
      dismissedSessionRef.current.delete(pending[0].id);
      setActiveReminder(pending[0]);
      setReminderQueue(pending);
    } else if (schedules.length > 0) {
      setActiveReminder(schedules[0]);
      setReminderQueue([schedules[0]]);
    } else {
      const sampleItem: MedicineScheduleItem = {
        id: 'sample-reminder-demo',
        name: 'Vitamin D3 & Calcium',
        dosage: '1000 IU • 1 Tablet',
        time: '09:00 AM',
        timeCategory: 'Morning',
        timingInstruction: 'Take after breakfast with water',
        durationDays: 30,
        remainingDays: 24,
        startDate: todayStr,
        active: true,
      };
      setActiveReminder(sampleItem);
      setReminderQueue([sampleItem]);
    }
  };

  // Prescription Uploaded Handler
  const handlePrescriptionConfirmed = (newRx: Prescription, newSchedules: MedicineScheduleItem[]) => {
    setPrescriptions((prev) => [newRx, ...prev]);
    setSchedules((prev) => [...newSchedules, ...prev]);
  };

  // Lab Report Uploaded Handler
  const handleReportConfirmed = (newReport: MedicalReport) => {
    setReports((prevReports) => [newReport, ...prevReports]);
  };

  // Deletion Handlers
  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeletePrescription = (id: string) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    setSchedules((prev) => prev.filter((s) => s.prescriptionId !== id));
  };

  const handleDeleteReport = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateReport = (updatedReport: MedicalReport) => {
    setReports((prev) => prev.map((r) => (r.id === updatedReport.id ? updatedReport : r)));
  };

  const handleLogout = () => {
    clearUserStorage();
    activeUserIdRef.current = null;
    setUser(null);
    setPrescriptions([]);
    setSchedules([]);
    setAdherenceLogs([]);
    setReports([]);
    setComparisonReport(null);
    setActiveTab('dashboard');
  };

  const handleResetData = () => {
    if (user?.id) {
      resetCurrentUserData(user.id);
    }
    setPrescriptions([]);
    setSchedules([]);
    setAdherenceLogs([]);
    setReports([]);
    setComparisonReport(null);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 overflow-x-hidden ${theme === 'light' ? 'bg-[#f5f8f7] text-slate-900' : 'bg-[#031813] text-slate-100'}`}>
      <div aria-hidden="true" className="app-ambient app-ambient-one" />
      <div aria-hidden="true" className="app-ambient app-ambient-two" />
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        pendingCount={pendingCount}
        reportsCount={reports.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuthModal={handleLogout}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onLogout={handleLogout}
        onOpenReminderModal={() => handleTriggerReminder()}
      />

      {/* Main App Workspace */}
      <main className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                user={user}
                schedules={schedules}
                adherenceLogs={adherenceLogs}
                prescriptions={prescriptions}
                reports={reports}
                setActiveTab={setActiveTab}
                onLogAction={handleLogAction}
                onTriggerReminder={handleTriggerReminder}
                theme={theme}
              />
            )}

            {activeTab === 'schedule' && (
              <MedicineSchedule
                schedules={schedules}
                adherenceLogs={adherenceLogs}
                onLogAction={handleLogAction}
                onDeleteSchedule={handleDeleteSchedule}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'upload' && (
              <UploadCenter
                onPrescriptionConfirmed={handlePrescriptionConfirmed}
                onReportConfirmed={handleReportConfirmed}
                setActiveTab={setActiveTab}
                reportsCount={reports.length}
              />
            )}

            {activeTab === 'calendar' && (
              <AdherenceCalendar adherenceLogs={adherenceLogs} schedules={schedules} theme={theme} />
            )}

            {activeTab === 'comparison' && (
              <HealthReportComparison
                reports={reports}
                initialComparison={comparisonReport}
                onUpdateReport={handleUpdateReport}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsHistory
                prescriptions={prescriptions}
                reports={reports}
                onDeletePrescription={handleDeletePrescription}
                onDeleteReport={handleDeleteReport}
                onUpdateReport={handleUpdateReport}
                setActiveTab={setActiveTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Account Profile Details Modal */}
      <AccountModal
        user={user}
        prescriptionsCount={prescriptions.length}
        reportsCount={reports.length}
        streakDays={currentStreak}
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onLogout={handleLogout}
        onResetData={handleResetData}
      />

      {/* Floating Reminder Modal */}
      <ReminderModal
        item={activeReminder}
        itemsQueue={reminderQueue}
        onClose={handleDismissReminder}
        onLogAction={handleLogAction}
        onSnooze={handleSnoozeReminder}
      />

      {/* Subtle Minimal Footer */}
      <footer className={`relative z-10 border-t py-6 text-center text-xs ${theme === 'light' ? 'bg-white/60 border-slate-200/80 text-slate-500' : 'bg-[#02120e]/70 border-emerald-900/40 text-emerald-300/60'}`}>
        <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold tracking-tight">MedTrack AI <span className="font-medium opacity-70">— your health, in one clear view</span></span>
          <span className="font-semibold">Private &amp; secure health workspace</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
