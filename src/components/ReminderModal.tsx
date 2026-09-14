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
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  item,
  itemsQueue = [],
  onClose,
  onLogAction,
  onSnooze,
}) => {
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
        <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-emerald-500/70 bg-gradient-to-b from-[#092e24] to-[#041a14] text-white p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-2xl">
          
          {/* Ambient Lighting Accents */}
          <div aria-hidden="true" className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-400/25 blur-2xl pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="relative flex items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/20 text-[#c5ff7b] ring-1 ring-emerald-400/40">
                <Bell className="w-4 h-4 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c5ff7b] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c5ff7b]" />
                </span>
              </span>

              <div>
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#c5ff7b]">
                  <Sparkles className="w-3 h-3" /> Medication Due Now
                </span>
                {activeList.length > 1 && (
                  <span className="text-[10px] font-bold text-emerald-200/60">
                    Dose {currentIndex + 1} of {activeList.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSpeak}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Play voice announcement"
                aria-label="Play voice announcement"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Dismiss reminder"
                aria-label="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Medicine Card Content */}
          <div className="relative mt-4 space-y-3">
            <div className="flex items-start gap-3.5 bg-black/25 rounded-2xl p-4 border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                <Pill className="w-6 h-6 -rotate-45" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-black tracking-tight truncate text-white">
                    {currentItem.name}
                  </h3>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#c5ff7b] text-[#092e24]">
                    {currentItem.dosage}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-200 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {currentItem.time}
                  </span>
                  <span className="text-emerald-400/40">•</span>
                  <span className="text-emerald-100/75 font-medium truncate">
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
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c5ff7b]" /> Enable desktop notifications
                </span>
                <span className="text-[#c5ff7b] underline text-[10px] uppercase tracking-wider">Enable</span>
              </button>
            )}

            {/* Pagination Controls if queue > 1 */}
            {activeList.length > 1 && (
              <div className="flex items-center justify-between text-xs font-bold text-emerald-200/70 pt-0.5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
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
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
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
                className="sm:col-span-6 py-3 px-4 rounded-xl bg-[#c5ff7b] hover:bg-[#b5f566] text-[#05231b] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Taken</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSnooze}
                className="sm:col-span-3 py-3 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                title="Remind again in 10 minutes"
              >
                <TimerReset className="w-3.5 h-3.5 text-amber-400" />
                <span>10m</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSkip}
                className="sm:col-span-3 py-3 px-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/40 text-emerald-100/70 hover:text-rose-200 font-bold text-xs flex items-center justify-center gap-1 border border-white/5 transition-colors cursor-pointer"
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
