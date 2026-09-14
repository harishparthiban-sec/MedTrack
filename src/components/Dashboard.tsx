import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  HeartPulse,
  Pill,
  Plus,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import type { AdherenceLog, MedicalReport, MedicineScheduleItem, Prescription, UserProfile } from '../types';
import { calculateAdherenceStreak } from '../services/adherence';

interface DashboardProps {
  user: UserProfile | null;
  schedules: MedicineScheduleItem[];
  adherenceLogs: AdherenceLog[];
  prescriptions: Prescription[];
  reports?: MedicalReport[];
  setActiveTab: (tab: string) => void;
  onLogAction: (scheduleId: string, status: 'taken' | 'ignored') => void;
  onTriggerReminder?: (item?: MedicineScheduleItem) => void;
  theme: 'dark' | 'light';
}

const motionIn = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const formatDate = () => new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
}).format(new Date());

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  schedules,
  adherenceLogs,
  prescriptions,
  reports = [],
  setActiveTab,
  onLogAction,
  onTriggerReminder,
  theme,
}) => {
  const isDark = theme === 'dark';
  const today = new Date().toISOString().split('T')[0];
  const activeSchedules = schedules.filter((item) => item.active);
  const todayLogs = adherenceLogs.filter((item) => item.date === today);
  const takenIds = new Set(todayLogs.filter((item) => item.status === 'taken').map((item) => item.scheduleId));
  const resolvedIds = new Set(todayLogs.map((item) => item.scheduleId));
  const pendingSchedules = activeSchedules.filter((item) => !resolvedIds.has(item.id));
  const adherence = activeSchedules.length ? Math.round((takenIds.size / activeSchedules.length) * 100) : 0;
  const streak = calculateAdherenceStreak(adherenceLogs);
  const nextDose = pendingSchedules[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const latestReport = [...reports].sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''))[0];
  const abnormalCount = latestReport?.testResults.filter((item) => item.isAbnormal).length ?? 0;
  const surface = isDark ? 'border-white/[0.08] bg-[#09251f] text-white' : 'border-slate-200 bg-white text-[#123d35] shadow-[0_14px_38px_rgba(15,42,36,0.06)]';
  const muted = isDark ? 'text-emerald-100/55' : 'text-slate-500';
  const subduedSurface = isDark ? 'bg-white/[0.055] border-white/[0.07]' : 'bg-[#f3f7f4] border-[#e1ece6]';

  return (
    <div className="dashboard-new space-y-6 pb-16 pt-2">
      <motion.section {...motionIn} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.17em] ${isDark ? 'text-[#c5ff7b]' : 'text-emerald-700'}`}>
            <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-[#c5ff7b]' : 'bg-emerald-500'}`} /> Your daily brief
          </div>
          <h1 className={`max-w-3xl text-4xl font-black leading-[0.9] tracking-[-0.07em] sm:text-5xl lg:text-6xl ${isDark ? 'text-white' : 'text-[#123d35]'}`}>
            {greeting}, {user?.name?.split(' ')[0] || 'there'}.<br />Let&apos;s keep your <span className={isDark ? 'text-[#c5ff7b]' : 'text-emerald-500'}>care in flow.</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`hidden rounded-xl border px-3 py-2 text-xs font-bold sm:flex sm:items-center sm:gap-2 ${subduedSurface} ${muted}`}><CalendarDays className="h-3.5 w-3.5" />{formatDate()}</div>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTriggerReminder?.(nextDose || activeSchedules[0])}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3 text-xs font-bold text-emerald-700 dark:text-[#c5ff7b] hover:bg-emerald-500/20 transition-all cursor-pointer"
            title="Trigger notification alert pop-up"
          >
            <Bell className="h-3.5 w-3.5 text-[#c5ff7b] animate-bounce" />
            <span>Test Pop-up</span>
          </motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setActiveTab('upload')} className="flex items-center gap-2 rounded-xl bg-[#123d35] px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-950/15 cursor-pointer"><Plus className="h-4 w-4 text-[#c5ff7b]" /> Add record</motion.button>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <motion.section {...motionIn} transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden rounded-[2rem] bg-[#123d35] p-6 text-white sm:p-8 xl:col-span-7">
          <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#c5ff7b]/20 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-36 right-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#c5ff7b]"><Sparkles className="h-3.5 w-3.5" /> Today&apos;s care plan</p>
                <h2 className="mt-3 max-w-lg text-3xl font-black leading-[0.96] tracking-[-0.06em] sm:text-4xl">
                  {nextDose ? <>Your next dose is <span className="text-[#c5ff7b]">ready when you are.</span></> : activeSchedules.length ? <>You&apos;re all <span className="text-[#c5ff7b]">caught up.</span></> : <>Start a plan that <span className="text-[#c5ff7b]">works for you.</span></>}
                </h2>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-[#c5ff7b]"><HeartPulse className="h-6 w-6" /></div>
            </div>

            {nextDose ? (
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 backdrop-blur-md sm:flex sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#c5ff7b] text-[#123d35]"><Pill className="h-5 w-5 -rotate-45" /></div>
                  <div><p className="text-lg font-black tracking-[-0.04em]">{nextDose.name}</p><p className="mt-0.5 text-xs font-semibold text-white/60">{nextDose.dosage} · {nextDose.timingInstruction}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 sm:mt-0 sm:justify-end">
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-[#c5ff7b]"><Clock3 className="mr-1.5 inline h-3.5 w-3.5" />{nextDose.time}</span>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => onTriggerReminder?.(nextDose)} className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer" title="Preview notification pop-up for this dose"><Bell className="h-3.5 w-3.5 text-[#c5ff7b]" /> Pop-up</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => onLogAction(nextDose.id, 'taken')} className="rounded-xl bg-[#c5ff7b] px-4 py-2 text-xs font-black text-[#123d35] cursor-pointer">Mark taken</motion.button>
                </div>
              </div>
            ) : (
              <button onClick={() => setActiveTab('upload')} className="flex w-fit items-center gap-2 rounded-xl bg-[#c5ff7b] px-4 py-3 text-xs font-black text-[#123d35]"><Upload className="h-4 w-4" /> Upload your prescription</button>
            )}
          </div>
        </motion.section>

        <motion.section {...motionIn} transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }} className={`rounded-[2rem] border p-6 sm:p-7 xl:col-span-5 ${surface}`}>
          <div className="flex items-start justify-between"><div><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${muted}`}>Daily consistency</p><h2 className="mt-2 text-2xl font-black tracking-[-0.055em]">Your rhythm</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-500"><Flame className="h-5 w-5" /></span></div>
          <div className="mt-6 flex items-center gap-6">
            <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#51e2a8 ${adherence * 3.6}deg, ${isDark ? 'rgba(255,255,255,0.08)' : '#e7eee9'} 0deg)` }}>
              <div className={`grid h-20 w-20 place-items-center rounded-full ${isDark ? 'bg-[#09251f]' : 'bg-white'}`}><span className="text-2xl font-black tracking-[-0.06em]">{adherence}%</span></div>
            </div>
            <div><p className="text-3xl font-black tracking-[-0.06em]">{takenIds.size}<span className={`ml-1 text-base font-bold ${muted}`}>/ {activeSchedules.length}</span></p><p className={`mt-1 text-xs font-semibold ${muted}`}>doses complete today</p><div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black text-amber-600"><Flame className="h-3 w-3" /> {streak || 'Start'} day {streak === 1 ? 'streak' : 'streak'}</div></div>
          </div>
          <div className={`mt-6 border-t pt-4 ${isDark ? 'border-white/8' : 'border-slate-100'}`}><button onClick={() => setActiveTab('calendar')} className={`flex w-full items-center justify-between text-xs font-black ${isDark ? 'text-white/70 hover:text-white' : 'text-[#123d35]'}`}>See your monthly rhythm <ArrowUpRight className="h-4 w-4 text-emerald-500" /></button></div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <motion.section {...motionIn} transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }} className={`rounded-[2rem] border p-5 sm:p-7 xl:col-span-8 ${surface}`}>
          <div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${muted}`}>Your day, at a glance</p><h2 className="mt-2 text-2xl font-black tracking-[-0.055em]">Dose timeline</h2></div><button onClick={() => setActiveTab('schedule')} className={`flex items-center gap-1 text-xs font-black ${isDark ? 'text-[#c5ff7b]' : 'text-emerald-600'}`}>Full schedule <ChevronRight className="h-4 w-4" /></button></div>
          <div className="mt-6 space-y-2">
            {activeSchedules.length === 0 ? (
              <button onClick={() => setActiveTab('upload')} className={`group flex w-full items-center justify-between rounded-2xl border border-dashed p-5 text-left transition-colors ${subduedSurface} ${isDark ? 'hover:border-[#c5ff7b]/40' : 'hover:border-emerald-300'}`}><span><span className="block text-sm font-black">No doses in your timeline yet</span><span className={`mt-1 block text-xs font-medium ${muted}`}>Add a prescription and MedTrack will build the schedule for you.</span></span><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><Plus className="h-5 w-5" /></span></button>
            ) : activeSchedules.map((item, index) => {
              const log = todayLogs.find((entry) => entry.scheduleId === item.id);
              const isTaken = log?.status === 'taken';
              const isIgnored = log?.status === 'ignored';
              return (
                <motion.div layout key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 + index * 0.04 }} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isTaken ? (isDark ? 'border-emerald-400/25 bg-emerald-400/10' : 'border-emerald-200 bg-emerald-50') : isIgnored ? (isDark ? 'border-rose-300/20 bg-rose-400/10' : 'border-rose-200 bg-rose-50') : subduedSurface}`}>
                  <div className="flex items-center gap-4"><span className={`min-w-16 rounded-xl px-2 py-2 text-center text-[11px] font-black ${isDark ? 'bg-black/20 text-[#c5ff7b]' : 'bg-white text-emerald-700 shadow-sm'}`}>{item.time}</span><div><p className="text-sm font-black">{item.name}</p><p className={`mt-0.5 text-xs font-medium ${muted}`}>{item.dosage} · {item.timingInstruction}</p></div></div>
                  {isTaken ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Taken {log?.timestamp && `at ${log.timestamp}`}</span> : isIgnored ? <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-[10px] font-black text-rose-600"><X className="h-3.5 w-3.5" /> Skipped</span> : <div className="flex gap-2"><button onClick={() => onLogAction(item.id, 'taken')} className="rounded-xl bg-[#123d35] px-3 py-2 text-[10px] font-black text-white"><Check className="mr-1 inline h-3.5 w-3.5 text-[#c5ff7b]" /> Taken</button><button onClick={() => onLogAction(item.id, 'ignored')} className={`rounded-xl border px-3 py-2 text-[10px] font-black ${isDark ? 'border-white/10 text-white/70' : 'border-slate-200 text-slate-500'}`}>Skip</button></div>}
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.aside {...motionIn} transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }} className="space-y-5 xl:col-span-4">
          <section className="relative overflow-hidden rounded-[2rem] bg-[#c5ff7b] p-6 text-[#123d35]">
            <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[20px] border-[#123d35]/10" />
            <div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">Health records</p><h2 className="mt-2 max-w-[15rem] text-3xl font-black leading-[0.95] tracking-[-0.06em]">Your data has a story.</h2>
              <div className="mt-7 flex items-end justify-between"><div><p className="text-4xl font-black tracking-[-0.07em]">{reports.length}</p><p className="mt-1 text-xs font-bold opacity-70">lab report{reports.length === 1 ? '' : 's'} in one view</p></div><button onClick={() => setActiveTab(reports.length >= 2 ? 'comparison' : 'reports')} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#123d35] text-[#c5ff7b]"><ArrowUpRight className="h-5 w-5" /></button></div>
            </div>
          </section>

          <section className={`rounded-[2rem] border p-6 ${surface}`}><div className="flex items-center justify-between"><div><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${muted}`}>Latest signal</p><h3 className="mt-2 text-lg font-black tracking-[-0.045em]">{latestReport ? latestReport.labName || 'Lab report' : 'Nothing to review yet'}</h3></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500"><TrendingUp className="h-5 w-5" /></span></div>
            {latestReport ? <><p className={`mt-3 text-xs font-medium ${muted}`}>{latestReport.reportDate} · {latestReport.testResults.length} markers scanned</p><div className={`mt-4 rounded-2xl border p-3 ${subduedSurface}`}><p className="text-xs font-black">{abnormalCount ? `${abnormalCount} item${abnormalCount === 1 ? '' : 's'} worth reviewing` : 'Everything looks in range'}</p><p className={`mt-1 text-[11px] font-medium ${muted}`}>{abnormalCount ? 'Open your report to see the flagged biomarkers.' : 'Keep tracking to spot changes over time.'}</p></div></> : <><p className={`mt-3 text-xs font-medium ${muted}`}>Upload a report and turn clinical results into a clear progress story.</p><button onClick={() => setActiveTab('upload')} className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-emerald-600">Upload report <ArrowUpRight className="h-3.5 w-3.5" /></button></>}
          </section>

          <section className={`rounded-[2rem] border p-6 ${surface}`}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600"><FileText className="h-5 w-5" /></span><div><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${muted}`}>Medication library</p><p className="mt-1 text-sm font-black">{prescriptions.length} active prescription{prescriptions.length === 1 ? '' : 's'}</p></div></div><button onClick={() => setActiveTab('reports')} className={`mt-4 flex w-full items-center justify-between border-t pt-4 text-xs font-black ${isDark ? 'border-white/8 text-white/70' : 'border-slate-100 text-[#123d35]'}`}>View your records <ArrowUpRight className="h-4 w-4 text-emerald-500" /></button></section>
        </motion.aside>
      </div>
    </div>
  );
};
