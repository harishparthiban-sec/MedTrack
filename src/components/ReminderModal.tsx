import React, { useEffect } from 'react';
import { Clock, Volume2, CheckCircle2, XCircle, Bell, X } from 'lucide-react';
import type { MedicineScheduleItem } from '../types';
import { speakReminderText, sendDesktopNotification } from '../services/notifications';

interface ReminderModalProps {
  item: MedicineScheduleItem | null;
  onClose: () => void;
  onLogAction: (scheduleId: string, status: 'taken' | 'ignored') => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ item, onClose, onLogAction }) => {
  if (!item) return null;

  const handleSpeak = () => {
    speakReminderText(
      `Medication Reminder! Time to take your ${item.name}, ${item.dosage}. Timing instruction: ${item.timingInstruction}.`
    );
  };

  useEffect(() => {
    handleSpeak();
    sendDesktopNotification(item);
  }, [item]);

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-short">
      <div className="card-subtle rounded-3xl p-6 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 space-y-5">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300 animate-pulse">
              <Bell className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Medication Reminder
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSpeak}
              className="p-2 rounded-xl btn-secondary-visible text-emerald-600 dark:text-emerald-300 transition-colors cursor-pointer"
              title="Re-play Voice Alert"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl btn-secondary-visible transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Medicine Details */}
        <div className="space-y-1.5 bg-slate-50 dark:bg-[#031f17] p-4 rounded-2xl border border-slate-200 dark:border-emerald-900/30">
          <h3 className="text-xl font-extrabold">{item.name}</h3>
          <span className="inline-block px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
            {item.dosage}
          </span>
          <p className="text-xs flex items-center pt-1.5">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            <span>Scheduled: <strong className="text-emerald-600 dark:text-emerald-400">{item.time}</strong> ({item.timingInstruction})</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            onClick={() => {
              onLogAction(item.id, 'taken');
              onClose();
            }}
            className="flex-1 py-3.5 rounded-2xl btn-primary-visible font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>✅ Mark as Taken</span>
          </button>

          <button
            onClick={() => {
              onLogAction(item.id, 'ignored');
              onClose();
            }}
            className="flex-1 py-3.5 rounded-2xl btn-secondary-visible font-extrabold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            <XCircle className="w-4 h-4" />
            <span>✕ Mark as Ignored</span>
          </button>
        </div>

      </div>
    </div>
  );
};
