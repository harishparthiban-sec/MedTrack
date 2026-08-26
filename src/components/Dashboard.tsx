import React from 'react';
import {
  Pill,
  CheckCircle2,
  XCircle,
  Calendar,
  Upload,
  BarChart3,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  FileText,
  Clock,
  Sunrise,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import type {
  UserProfile,
  MedicineScheduleItem,
  AdherenceLog,
  Prescription,
  HealthComparisonReport,
  MedicalReport,
} from '../types';

interface DashboardProps {
  user: UserProfile | null;
  schedules: MedicineScheduleItem[];
  adherenceLogs: AdherenceLog[];
  prescriptions: Prescription[];
  reports?: MedicalReport[];
  comparisonReport?: HealthComparisonReport | null;
  setActiveTab: (tab: string) => void;
  onLogAction: (scheduleId: string, status: 'taken' | 'ignored') => void;
  theme: 'dark' | 'light';
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  schedules,
  adherenceLogs,
  prescriptions,
  reports = [],
  setActiveTab,
  onLogAction,
  theme,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isDark = theme === 'dark';

  // Adherence Calculations (Deduplicated strictly to active schedules)
  const activeSchedules = schedules.filter((s) => s.active);
  const activeScheduleIds = new Set(activeSchedules.map((s) => s.id));
  const todayLogs = adherenceLogs.filter(
    (l) => l.date === todayStr && activeScheduleIds.has(l.scheduleId)
  );

  const takenScheduleIds = new Set(
    todayLogs.filter((l) => l.status === 'taken').map((l) => l.scheduleId)
  );
  const takenTodayCount = takenScheduleIds.size;
  const totalToday = activeSchedules.length;
  const adherencePercentage =
    totalToday > 0 ? Math.min(100, Math.round((takenTodayCount / totalToday) * 100)) : 100;

  // Next Dose Logic
  const loggedScheduleIds = new Set(todayLogs.map((l) => l.scheduleId));
  const pendingSchedules = activeSchedules.filter((s) => !loggedScheduleIds.has(s.id));
  const nextDose = pendingSchedules[0] || activeSchedules[0] || null;

  // Time of Day Greeting
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Theme-aware classes
  const cardBg = isDark
    ? 'bg-[#07281f] border-emerald-900/30'
    : 'bg-white border-slate-200 shadow-sm';

  const labelText = isDark ? 'text-emerald-300/60' : 'text-slate-500';
  const titleText = isDark ? 'text-white' : 'text-slate-900';
  const bodyText = isDark ? 'text-slate-300' : 'text-slate-600';
  const ringTrack = isDark ? 'text-emerald-900' : 'text-slate-200';

  const subCardBg = isDark
    ? 'bg-emerald-950/60 border-emerald-900/30'
    : 'bg-slate-50 border-slate-200';

  const scheduleItemDefault = isDark
    ? 'bg-[#031f17] border-emerald-900/30'
    : 'bg-slate-50 border-slate-200';

  const iconBoxBg = isDark ? 'bg-emerald-900/40 border-emerald-800/50' : 'bg-slate-100 border-slate-200';
  const iconColor = isDark ? 'text-emerald-400' : 'text-emerald-600';
  const quickNavBg = isDark
    ? 'bg-[#031f17] hover:bg-emerald-950 border-emerald-900/30 text-emerald-100'
    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';

  const navLinkCls = isDark
    ? 'text-emerald-400 hover:text-emerald-300'
    : 'text-emerald-600 hover:text-emerald-700';

  const borderDivider = isDark ? 'border-emerald-900/30' : 'border-slate-200';

  return (
    <div className="space-y-8 pb-16 pt-2">
      
      {/* 1. Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-7 sm:p-10 shadow-2xl transition-all duration-300">
        
        {/* Subtle Background Gradient Overlay */}
        <div 
          className={`absolute inset-0 transition-all duration-300 ${
            isDark 
              ? 'bg-gradient-to-r from-emerald-950 via-[#063b2c] to-[#04241b] border border-emerald-800/40 shadow-emerald-950/40' 
              : 'bg-gradient-to-r from-emerald-100 via-teal-50 to-emerald-50/80 border border-emerald-200 shadow-emerald-500/10'
          }`}
        />

        {/* Ambient Glow Orbs */}
        <div 
          className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
            isDark ? 'bg-emerald-500/10' : 'bg-emerald-400/20'
          }`}
        />
        <div 
          className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
            isDark ? 'bg-teal-500/10' : 'bg-teal-300/25'
          }`}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                isDark 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-emerald-600/10 border-emerald-600/30 text-emerald-800'
              }`}>
                {greeting}, {user?.name || 'Patient'}
              </span>
              <span 
                className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  isDark
                    ? 'bg-black/30 border-white/10 text-emerald-200/90'
                    : 'bg-white/90 border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                📅 {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Health &amp; Medication Command Center
            </h1>

            <p className={`text-sm max-w-xl font-medium ${isDark ? 'text-emerald-200/80' : 'text-slate-600'}`}>
              Track daily medicines, inspect prescription extractions, and monitor blood report biomarkers in real-time.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('upload')}
              className="px-5 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center space-x-2 cursor-pointer shadow-lg"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-5 py-3.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 cursor-pointer transition-all ${
                isDark
                  ? 'border border-white/20 bg-white/10 hover:bg-white/20 text-white'
                  : 'border border-emerald-300 bg-white hover:bg-emerald-50/60 text-emerald-900 shadow-sm'
              }`}
            >
              <Pill className="w-4 h-4 text-emerald-600" />
              <span>Daily Dose Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Metric 1: Adherence Score Ring */}
        <div className={`rounded-3xl p-6 flex items-center justify-between border ${cardBg}`}>
          <div className="space-y-1">
            <span className={`text-xs font-extrabold uppercase tracking-wider block ${labelText}`}>Today's Adherence</span>
            <div className={`text-3xl font-extrabold ${titleText}`}>{adherencePercentage}%</div>
            <span className="text-[11px] font-extrabold text-emerald-500 block">
              {totalToday === 0 ? 'No Doses Scheduled' : `${takenTodayCount} of ${totalToday} Doses Taken`}
            </span>
          </div>

          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" className={ringTrack} fill="transparent" />
              <circle
                cx="32" cy="32" r="26"
                stroke="currentColor" strokeWidth="6"
                className="text-emerald-500 transition-all duration-1000 ease-out"
                fill="transparent"
                strokeDasharray={163}
                strokeDashoffset={163 - (163 * adherencePercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <Sparkles className="w-5 h-5 text-emerald-500 absolute" />
          </div>
        </div>

        {/* Metric 2: Streak Counter */}
        <div className={`rounded-3xl p-6 flex items-center justify-between border ${cardBg}`}>
          <div className="space-y-1">
            <span className={`text-xs font-extrabold uppercase tracking-wider block ${labelText}`}>Adherence Streak</span>
            <div className={`text-3xl font-extrabold flex items-center ${titleText}`}>
              {user?.streakDays ?? 1} <span className="text-amber-500 text-xl ml-1">Days</span>
            </div>
            <span className="text-[11px] font-extrabold text-amber-500 block">🔥 Perfect Consistency</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Flame className="w-7 h-7" />
          </div>
        </div>

        {/* Metric 3: Active Prescriptions */}
        <div className={`rounded-3xl p-6 flex items-center justify-between border ${cardBg}`}>
          <div className="space-y-1">
            <span className={`text-xs font-extrabold uppercase tracking-wider block ${labelText}`}>Prescriptions Active</span>
            <div className={`text-3xl font-extrabold ${titleText}`}>{prescriptions.length}</div>
            <span className="text-[11px] font-extrabold text-cyan-500 block">📄 {prescriptions.length === 1 ? 'Prescription' : 'Prescriptions'} Active</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
            <FileText className="w-7 h-7" />
          </div>
        </div>

        {/* Metric 4: Health Reports */}
        <div className={`rounded-3xl p-6 flex items-center justify-between border ${cardBg}`}>
          <div className="space-y-1">
            <span className={`text-xs font-extrabold uppercase tracking-wider block ${labelText}`}>Lab Reports</span>
            <div className={`text-3xl font-extrabold ${titleText}`}>{reports.length} {reports.length === 1 ? 'Report' : 'Reports'}</div>
            <span className="text-[11px] font-extrabold text-indigo-500 block">📊 Biomarkers Compared</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
            <BarChart3 className="w-7 h-7" />
          </div>
        </div>

      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left 8 Cols: Next Dose & Daily Timeline */}
        <div className="lg:col-span-8 space-y-8">

          {/* Next Scheduled Dose Highlight Card */}
          {nextDose ? (
            <div className={`rounded-3xl p-7 border-2 border-emerald-500/40 space-y-6 ${isDark ? 'bg-[#042f1e]' : 'bg-emerald-50'}`}>

              <div className={`flex items-center justify-between border-b pb-4 ${borderDivider}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold ${isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'}`}>
                    <Pill className="w-5 h-5 transform -rotate-45" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider block">
                      Immediate Dose Up Next
                    </span>
                    <h3 className={`text-2xl font-extrabold ${titleText}`}>{nextDose.name}</h3>
                  </div>
                </div>

                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Scheduled: {nextDose.time}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] uppercase block mb-1 ${labelText}`}>Dosage Amount</span>
                  <span className={`text-sm font-extrabold ${titleText}`}>{nextDose.dosage}</span>
                </div>
                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] uppercase block mb-1 ${labelText}`}>Timing Instruction</span>
                  <span className="text-sm font-extrabold text-emerald-500">{nextDose.timingInstruction}</span>
                </div>
                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] uppercase block mb-1 ${labelText}`}>Duration Remaining</span>
                  <span className="text-sm font-extrabold text-cyan-500">{nextDose.remainingDays} days left</span>
                </div>
              </div>

              {/* Dose Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => onLogAction(nextDose.id, 'taken')}
                  className="flex-1 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✅ Mark as Taken</span>
                </button>

                <button
                  onClick={() => onLogAction(nextDose.id, 'ignored')}
                  className="flex-1 py-3.5 rounded-2xl btn-secondary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>✕ Mark as Ignored</span>
                </button>
              </div>

            </div>
          ) : (
            <div className={`rounded-3xl p-8 text-center space-y-3 border ${cardBg}`}>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className={`text-xl font-extrabold ${titleText}`}>All Doses Logged For Today!</h3>
              <p className={`text-xs ${bodyText}`}>You have completed all scheduled medications for today.</p>
            </div>
          )}

          {/* Today's Schedule Overview List */}
          <div className={`rounded-3xl p-6 sm:p-7 space-y-5 border ${cardBg}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-extrabold flex items-center space-x-2 ${titleText}`}>
                <Clock className={`w-5 h-5 ${iconColor}`} />
                <span>Today's Medicine Schedule ({activeSchedules.length})</span>
              </h3>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`text-xs font-extrabold flex items-center space-x-1 cursor-pointer ${navLinkCls}`}
              >
                <span>View Full Schedule</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {activeSchedules.length === 0 && (
                <p className={`text-xs text-center py-4 ${bodyText}`}>No medicines scheduled yet. Add a schedule to get started.</p>
              )}
              {activeSchedules.map((item) => {
                const log = todayLogs.find((l) => l.scheduleId === item.id);
                const isTaken = log?.status === 'taken';
                const isIgnored = log?.status === 'ignored';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isTaken
                        ? isDark ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                        : isIgnored
                        ? isDark ? 'bg-rose-500/10 border-rose-500/40' : 'bg-rose-50 border-rose-300'
                        : scheduleItemDefault
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold ${iconBoxBg}`}>
                        {item.timeCategory === 'Morning' && <Sunrise className="w-4 h-4 text-amber-500" />}
                        {item.timeCategory === 'Afternoon' && <Sun className="w-4 h-4 text-cyan-500" />}
                        {item.timeCategory === 'Night' && <Moon className="w-4 h-4 text-indigo-500" />}
                      </div>

                      <div>
                        <h4 className={`text-sm font-extrabold ${titleText}`}>{item.name}</h4>
                        <span className={`text-xs ${bodyText}`}>
                          {item.dosage} • <strong className="text-emerald-500">{item.time}</strong> ({item.timingInstruction})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isTaken ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500 text-white">
                          ✓ Taken ({log.timestamp})
                        </span>
                      ) : isIgnored ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-500 text-white">
                          ✕ Ignored
                        </span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onLogAction(item.id, 'taken')}
                            className="px-3.5 py-1.5 rounded-xl btn-primary-visible text-xs font-extrabold cursor-pointer"
                          >
                            ✅ Taken
                          </button>
                          <button
                            onClick={() => onLogAction(item.id, 'ignored')}
                            className="px-3.5 py-1.5 rounded-xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
                          >
                            ✕ Ignored
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 4 Cols */}
        <div className="lg:col-span-4 space-y-8">

          {/* Health Lab Report Trends Card */}
          <div className={`rounded-3xl p-6 space-y-5 border ${cardBg}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${borderDivider}`}>
              <h3 className={`text-base font-extrabold flex items-center space-x-2 ${titleText}`}>
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <span>Lab Test Progress</span>
              </h3>

              <button
                onClick={() => setActiveTab('comparison')}
                className="text-xs font-extrabold text-indigo-500 hover:text-indigo-400"
              >
                Full Analysis
              </button>
            </div>

            {/* Biomarker Trend Items */}
            <div className="space-y-3.5 text-xs font-bold">
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${subCardBg}`}>
                <div>
                  <span className={`block text-[11px] ${labelText}`}>HbA1c (Diabetes)</span>
                  <span className="text-emerald-500 font-extrabold text-sm">6.2% (Normal)</span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" /> Improved
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${subCardBg}`}>
                <div>
                  <span className={`block text-[11px] ${labelText}`}>Vitamin D</span>
                  <span className="text-emerald-500 font-extrabold text-sm">35 ng/mL</span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> Improved
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${subCardBg}`}>
                <div>
                  <span className={`block text-[11px] ${labelText}`}>Fasting Blood Sugar</span>
                  <span className="text-amber-500 font-extrabold text-sm">118 mg/dL</span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center">
                  Needs Review
                </span>
              </div>
            </div>
          </div>

          {/* Safety Alert Card */}
          <div className={`rounded-3xl p-6 space-y-4 border border-amber-500/30 ${isDark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h4 className={`text-sm font-extrabold ${titleText}`}>Handwritten Safety Check</h4>
            </div>

            <p className={`text-xs font-medium ${bodyText}`}>
              AI scanned 1 handwritten note in your prescription:{' '}
              <strong className="text-amber-500">"Take after food with warm water"</strong>.
            </p>

            <button
              onClick={() => setActiveTab('upload')}
              className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 font-extrabold text-xs border border-amber-500/40 cursor-pointer transition-all"
            >
              Verify Ambiguous Notes
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className={`rounded-3xl p-6 space-y-3 border ${cardBg}`}>
            <h4 className={`text-xs font-extrabold uppercase tracking-wider ${labelText}`}>Quick Navigation</h4>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full p-3 rounded-2xl font-bold text-xs flex items-center justify-between border cursor-pointer transition-all ${quickNavBg}`}
            >
              <div className="flex items-center space-x-2.5">
                <Calendar className={`w-4 h-4 ${iconColor}`} />
                <span>Monthly Adherence Calendar</span>
              </div>
              <ArrowUpRight className={`w-4 h-4 ${labelText}`} />
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full p-3 rounded-2xl font-bold text-xs flex items-center justify-between border cursor-pointer transition-all ${quickNavBg}`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-cyan-500" />
                <span>Stored Prescriptions &amp; Reports</span>
              </div>
              <ArrowUpRight className={`w-4 h-4 ${labelText}`} />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
