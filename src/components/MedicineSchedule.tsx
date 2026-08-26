import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Sun,
  Sunrise,
  Moon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { MedicineScheduleItem, AdherenceLog } from '../types';

interface MedicineScheduleProps {
  schedules: MedicineScheduleItem[];
  adherenceLogs: AdherenceLog[];
  onLogAction: (scheduleId: string, status: 'taken' | 'ignored') => void;
  onDeleteSchedule: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const MedicineSchedule: React.FC<MedicineScheduleProps> = ({
  schedules,
  adherenceLogs,
  onLogAction,
  onDeleteSchedule,
  setActiveTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = adherenceLogs.filter((l) => l.date === todayStr);

  const getLogStatus = (scheduleId: string) => {
    const log = todayLogs.find((l) => l.scheduleId === scheduleId);
    return log ? log : null;
  };

  const handleTakenWithConfetti = (scheduleId: string) => {
    onLogAction(scheduleId, 'taken');

    const updatedCount = todayLogs.filter((l) => l.status === 'taken').length + 1;
    if (updatedCount >= schedules.length) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#38bdf8'],
      });
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (filter === 'morning') return s.timeCategory === 'Morning';
    if (filter === 'afternoon') return s.timeCategory === 'Afternoon';
    if (filter === 'night') return s.timeCategory === 'Night';
    return true;
  });

  return (
    <div className="space-y-8 pb-16 pt-2 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Daily Medication Schedule
          </h1>
          <p className="text-sm font-medium">
            Click <strong className="text-emerald-500 font-extrabold">Mark as Taken</strong> when you take your medicine, or <strong className="text-rose-500 font-extrabold">Mark as Ignored</strong> if skipped.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('upload')}
          className="flex items-center space-x-2 px-5 py-3 rounded-2xl btn-primary-visible text-xs sm:text-sm font-extrabold shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto space-x-2.5 pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            filter === 'all'
              ? 'btn-primary-visible'
              : 'btn-secondary-visible'
          }`}
        >
          All Schedules ({schedules.length})
        </button>

        <button
          onClick={() => setFilter('morning')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            filter === 'morning'
              ? 'btn-primary-visible'
              : 'btn-secondary-visible'
          }`}
        >
          <Sunrise className="w-4 h-4 text-amber-500" />
          <span>Morning</span>
        </button>

        <button
          onClick={() => setFilter('afternoon')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            filter === 'afternoon'
              ? 'btn-primary-visible'
              : 'btn-secondary-visible'
          }`}
        >
          <Sun className="w-4 h-4 text-cyan-500" />
          <span>Afternoon</span>
        </button>

        <button
          onClick={() => setFilter('night')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            filter === 'night'
              ? 'btn-primary-visible'
              : 'btn-secondary-visible'
          }`}
        >
          <Moon className="w-4 h-4 text-indigo-500" />
          <span>Night</span>
        </button>
      </div>

      {/* Empty State */}
      {filteredSchedules.length === 0 && (
        <div className="card-subtle rounded-3xl p-10 text-center space-y-4">
          <Clock className="w-12 h-12 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold">No Medicines Found</h3>
            <p className="text-xs font-medium">
              Upload your doctor prescription to automatically generate your daily medicine schedule.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('upload')}
            className="px-5 py-3 rounded-2xl btn-primary-visible text-xs font-extrabold inline-flex items-center space-x-2 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Prescription</span>
          </button>
        </div>
      )}

      {/* Schedule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSchedules.map((item) => {
          const log = getLogStatus(item.id);
          const isTaken = log?.status === 'taken';
          const isIgnored = log?.status === 'ignored';

          return (
            <div
              key={item.id}
              className={`card-subtle rounded-3xl p-6 sm:p-7 space-y-5 border ${
                isTaken
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : isIgnored
                  ? 'border-rose-500/60 bg-rose-500/10'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start">
                
                {/* Medicine Title & Info */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl font-extrabold">{item.name}</span>
                    <span className="px-2.5 py-0.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      {item.dosage}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-0.5">
                    <span className="flex items-center text-amber-600 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 mr-1.5" /> {item.time}
                    </span>
                    <span>•</span>
                    <span>{item.timingInstruction}</span>
                  </div>
                </div>

                {/* Status Pill */}
                <div>
                  {isTaken && (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Taken ({log.timestamp})</span>
                    </span>
                  )}
                  {isIgnored && (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500 text-white shadow-sm">
                      <XCircle className="w-4 h-4" />
                      <span>Ignored</span>
                    </span>
                  )}
                  {!isTaken && !isIgnored && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-600 border border-amber-500/30">
                      <span>Pending Dose</span>
                    </span>
                  )}
                </div>

              </div>

              {/* Progress & Duration Details */}
              <div className="pt-4 border-t border-slate-200 dark:border-emerald-900/30 flex items-center justify-between text-xs font-bold">
                <div className="flex items-center space-x-3">
                  <span>Duration: {item.durationDays} days</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-extrabold">{item.remainingDays} days remaining</span>
                </div>

                <button
                  onClick={() => onDeleteSchedule(item.id)}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Remove schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={() => handleTakenWithConfetti(item.id)}
                  className="flex-1 py-3.5 rounded-2xl btn-primary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isTaken ? '✓ Taken Recorded' : '✅ Mark as Taken'}</span>
                </button>

                <button
                  onClick={() => onLogAction(item.id, 'ignored')}
                  className="flex-1 py-3.5 rounded-2xl btn-secondary-visible text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isIgnored ? '✕ Ignored Recorded' : '✕ Mark as Ignored'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
