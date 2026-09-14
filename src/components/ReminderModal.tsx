import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Clock,
  Volume2,
  CheckCircle2,
  XCircle,
  X,
  TimerReset,
  Pill,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import type { MedicineScheduleItem } from '../types';
import {
  speakReminderText,
  playReminderSound,
  playSuccessSound,
  sendDesktopNotification,
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from '../services/notifications';

interface ReminderModalProps {
  item: MedicineScheduleItem | null;
  itemsQueue?: MedicineScheduleItem[];
  onClose: () => void;
  onLogAction: (scheduleId: string, status: 'taken' | 'ignored') => void;
  onSnooze?: (scheduleId: string, minutes: number) => void;
  theme?: 'dark' | 'light';
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  item,
  itemsQueue = [],
  onClose,
  onLogAction,
  onSnooze,
  theme,
}) => {
  const isDark = theme ? theme === 'dark' : document.documentElement.classList.contains('dark');
  // If a list of due items is provided, support cycling through them
  const activeList = itemsQueue.length > 0 ? itemsQueue : item ? [item] : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState(getNotificationPermissionStatus());
  const [hasPlayedArrival, setHasPlayedArrival] = useState<string | null>(null);

  // Keep index within bounds if items change
  const currentItem = activeList[currentIndex] || activeList[0] || null;

  useEffect(() => {
    if (currentItem && hasPlayedArrival !== currentItem.id) {
      setHasPlayedArrival(currentItem.id);
      playReminderSound();
      sendDesktopNotification(currentItem);
    }
  }, [currentItem, hasPlayedArrival]);

  if (!currentItem) return null;

  const handleSpeak = () => {
    speakReminderText(
      `Medication reminder. Time to take your ${currentItem.name}, ${currentItem.dosage}. ${currentItem.timingInstruction}.`
    );
  };

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    if (granted && currentItem) {
      sendDesktopNotification(currentItem);
    }
  };

  const handleTake = () => {
    playSuccessSound();
    onLogAction(currentItem.id, 'taken');
    advanceOrClose();
  };

  const handleSkip = () => {
    onLogAction(currentItem.id, 'ignored');
    advanceOrClose();
  };

  const handleSnooze = () => {
    if (onSnooze) {
      onSnooze(currentItem.id, 10);
    }
    advanceOrClose();
  };

  const advanceOrClose = () => {
    if (activeList.length > 1) {
      if (currentIndex < activeList.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        return;
      }
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="med-reminder-popup"
        initial={{ opacity: 0, y: 50, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="fixed bottom-5 right-5 z-[9999] max-w-[420px] w-[calc(100vw-2.5rem)] pointer-events-auto"
        role="alertdialog"
        aria-live="assertive"
      >
        <div className={`relative overflow-hidden rounded-[1.75rem] border-2 p-5 sm:p-6 backdrop-blur-2xl transition-colors ${
          isDark
            ? 'border-emerald-500/70 bg-gradient-to-b from-[#092e24] to-[#041a14] text-white shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(16,185,129,0.25)]'
            : 'border-emerald-500/40 bg-gradient-to-b from-white via-emerald-50/70 to-emerald-50 text-slate-900 shadow-[0_20px_60px_rgba(16,185,129,0.18),0_4px_24px_rgba(0,0,0,0.08)]'
        }`}>
          
          {/* Ambient Lighting Accents */}
          <div
            aria-hidden="true"
            className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
              isDark ? 'bg-emerald-400/25' : 'bg-emerald-300/30'
            }`}
          />
          <div
            aria-hidden="true"
            className={`absolute -bottom-16 -left-16 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
              isDark ? 'bg-cyan-400/20' : 'bg-teal-200/30'
            }`}
          />

          {/* Header Row */}
          <div className={`relative flex items-center justify-between gap-3 pb-3 border-b ${
            isDark ? 'border-emerald-500/20' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`relative flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${
                isDark
                  ? 'bg-emerald-400/20 text-[#c5ff7b] ring-emerald-400/40'
                  : 'bg-emerald-100 text-emerald-700 ring-emerald-300'
              }`}>
                <Bell className="w-4 h-4 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDark ? 'bg-[#c5ff7b]' : 'bg-emerald-500'}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDark ? 'bg-[#c5ff7b]' : 'bg-emerald-500'}`} />
                </span>
              </span>

              <div>
                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                  isDark ? 'text-[#c5ff7b]' : 'text-emerald-700'
                }`}>
                  <Sparkles className="w-3 h-3" /> Medication Due Now
                </span>
                {activeList.length > 1 && (
                  <span className={`text-[10px] font-bold ${
                    isDark ? 'text-emerald-200/60' : 'text-slate-500'
                  }`}>
                    Dose {currentIndex + 1} of {activeList.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSpeak}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Play voice announcement"
                aria-label="Play voice announcement"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-emerald-200/70 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                }`}
                title="Dismiss reminder"
                aria-label="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Medicine Card Content */}
          <div className="relative mt-4 space-y-3">
            <div className={`flex items-start gap-3.5 rounded-2xl p-4 border ${
              isDark
                ? 'bg-black/25 border-white/10'
                : 'bg-white border-emerald-200/80 shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                <Pill className="w-6 h-6 -rotate-45" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-lg font-black tracking-tight truncate ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentItem.name}
                  </h3>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    isDark
                      ? 'bg-[#c5ff7b] text-[#092e24]'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200/70'
                  }`}>
                    {currentItem.dosage}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 font-bold ${
                    isDark ? 'text-emerald-200' : 'text-emerald-700'
                  }`}>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {currentItem.time}
                  </span>
                  <span className={isDark ? 'text-emerald-400/40' : 'text-slate-300'}>•</span>
                  <span className={`font-medium truncate ${
                    isDark ? 'text-emerald-100/75' : 'text-slate-600'
                  }`}>
                    {currentItem.timingInstruction}
                  </span>
                </div>
              </div>
            </div>

            {/* Browser Desktop Push Prompt (if not granted) */}
            {permissionStatus === 'default' && (
              <button
                type="button"
                onClick={handleEnablePush}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className={`w-3.5 h-3.5 ${isDark ? 'text-[#c5ff7b]' : 'text-emerald-600'}`} /> Enable desktop notifications
                </span>
                <span className={`underline text-[10px] uppercase tracking-wider ${
                  isDark ? 'text-[#c5ff7b]' : 'text-emerald-700'
                }`}>
                  Enable
                </span>
              </button>
            )}

            {/* Pagination Controls if queue > 1 */}
            {activeList.length > 1 && (
              <div className={`flex items-center justify-between text-xs font-bold pt-0.5 ${
                isDark ? 'text-emerald-200/70' : 'text-slate-500'
              }`}>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer ${
                    isDark
                      ? 'hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent'
                      : 'hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous dose
                </button>
                <span className="text-[11px]">
                  {currentIndex + 1} of {activeList.length}
                </span>
                <button
                  type="button"
                  disabled={currentIndex === activeList.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(activeList.length - 1, prev + 1))}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer ${
                    isDark
                      ? 'hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent'
                      : 'hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700'
                  }`}
                >
                  Next dose <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleTake}
                className={`sm:col-span-6 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                  isDark
                    ? 'bg-[#c5ff7b] hover:bg-[#b5f566] text-[#05231b] shadow-emerald-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Taken</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSnooze}
                className={`sm:col-span-3 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Remind again in 10 minutes"
              >
                <TimerReset className="w-3.5 h-3.5 text-amber-500" />
                <span>10m</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSkip}
                className={`sm:col-span-3 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/40 text-emerald-100/70 hover:text-rose-200 border-white/5'
                    : 'bg-rose-50 hover:bg-rose-100 hover:border-rose-300 text-rose-700 border-rose-200'
                }`}
                title="Skip this dose today"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Skip</span>
              </motion.button>
            </div>

          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
