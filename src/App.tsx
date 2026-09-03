import { useState, useEffect, useRef } from 'react';
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

import { requestNotificationPermission, sendDesktopNotification } from './services/notifications';
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

  // Background real-time timer checking for scheduled medicine times every 30 seconds
  useEffect(() => {
    if (!user || schedules.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      const period = currentHours >= 12 ? 'PM' : 'AM';
      const hours12 = currentHours % 12 || 12;
      const formattedHours = String(hours12).padStart(2, '0');
      const formattedMinutes = String(currentMinutes).padStart(2, '0');
      const currentTimeStr = `${formattedHours}:${formattedMinutes} ${period}`;

      const activeSchedulesList = schedules.filter((s) => s.active);
      const todayLoggedSet = new Set(
        adherenceLogs.filter((l) => l.date === todayStr).map((l) => l.scheduleId)
      );

      const dueSchedule = activeSchedulesList.find(
        (s) => s.time === currentTimeStr && !todayLoggedSet.has(s.id)
      );

      if (dueSchedule && (!activeReminder || activeReminder.id !== dueSchedule.id)) {
        setActiveReminder(dueSchedule);
        sendDesktopNotification(dueSchedule);
      }
    };

    const intervalId = setInterval(checkReminders, 30000);
    return () => clearInterval(intervalId);
  }, [user, schedules, adherenceLogs, activeReminder, todayStr]);

  // Re-compute comparison report when reports state changes
  useEffect(() => {
    if (reports.length >= 2) {
      const comp = computeHealthComparison(reports[1], reports[0]);
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
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#041a14] text-slate-100'}`}>
      
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
      />

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            schedules={schedules}
            adherenceLogs={adherenceLogs}
            prescriptions={prescriptions}
            reports={reports}
            setActiveTab={setActiveTab}
            onLogAction={handleLogAction}
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
          <HealthReportComparison reports={reports} initialComparison={comparisonReport} />
        )}

        {activeTab === 'reports' && (
          <ReportsHistory
            prescriptions={prescriptions}
            reports={reports}
            onDeletePrescription={handleDeletePrescription}
            onDeleteReport={handleDeleteReport}
            setActiveTab={setActiveTab}
          />
        )}
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
        onClose={() => setActiveReminder(null)}
        onLogAction={handleLogAction}
      />

      {/* Subtle Minimal Footer */}
      <footer className={`border-t py-6 text-center text-xs ${theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#03140f] border-emerald-900/40 text-emerald-300/60'}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MedTrack AI — Smart Health & Medicine Tracker</span>
          <span className="font-semibold">Private & Secure • SQLite Backend</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
