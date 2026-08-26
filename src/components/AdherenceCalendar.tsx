import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdherenceLog, MedicineScheduleItem } from '../types';

interface AdherenceCalendarProps {
  adherenceLogs: AdherenceLog[];
  schedules: MedicineScheduleItem[];
  theme?: 'dark' | 'light';
}

export const AdherenceCalendar: React.FC<AdherenceCalendarProps> = ({
  adherenceLogs,
  schedules,
  theme,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Get total days in selected month and starting weekday offset
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonthCount = new Date(year, month + 1, 0).getDate();

  // Generate array of date strings for current month (YYYY-MM-DD)
  const monthDays = Array.from({ length: daysInMonthCount }, (_, i) => {
    const day = i + 1;
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
  });

  const getLogsForDate = (dateStr: string) => {
    return adherenceLogs.filter((l) => l.date === dateStr);
  };

  const getDayStatus = (dateStr: string) => {
    const logs = getLogsForDate(dateStr);
    if (logs.length === 0) return 'none';
    const takenCount = logs.filter((l) => l.status === 'taken').length;
    if (takenCount === schedules.length && schedules.length > 0) return 'full';
    if (takenCount > 0) return 'partial';
    return 'missed';
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isDark = theme ? theme === 'dark' : document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-8 pb-16 pt-2 max-w-6xl mx-auto">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight flex items-center space-x-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <CalendarIcon className="w-8 h-8 text-emerald-500" />
            <span>Adherence Calendar</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-1 font-medium ${isDark ? 'text-emerald-200/70' : 'text-slate-600'}`}>
            Navigate through any month and year to inspect historical medication compliance.
          </p>
        </div>

        {/* Legend */}
        <div className={`flex items-center space-x-3 text-xs font-bold p-3.5 rounded-2xl border ${
          isDark
            ? 'border-emerald-900/40 bg-[#07281f] text-emerald-100 shadow-lg'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
            <span>100% Taken</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Partial</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Missed</span>
          </div>
        </div>
      </div>

      {/* Calendar Card Container */}
      <div className={`rounded-3xl p-6 sm:p-8 space-y-6 border ${
        isDark
          ? 'bg-[#07281f] border-emerald-900/40 shadow-2xl text-white'
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        
        {/* Month & Year Navigation Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
          isDark ? 'border-emerald-900/30' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold">
              {monthNames[month]} {year}
            </h2>

            <button
              onClick={handleCurrentMonth}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Go to Today
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 rounded-xl btn-secondary-visible text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous Month</span>
            </button>

            <button
              onClick={handleNextMonth}
              className="p-2.5 rounded-xl btn-secondary-visible text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
              title="Next Month"
            >
              <span className="hidden sm:inline">Next Month</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day of Week Headers */}
        <div className={`grid grid-cols-7 gap-2 text-center text-xs font-extrabold uppercase tracking-wider pb-2 border-b ${
          isDark ? 'border-emerald-900/30 text-emerald-300/60' : 'border-slate-200 text-slate-500'
        }`}>
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2.5 sm:gap-3">
          
          {/* Empty Padding Cells for Month Offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div
              key={`offset-${idx}`}
              className={`p-3 rounded-2xl border border-transparent pointer-events-none ${
                isDark ? 'bg-[#031f17]/30' : 'bg-slate-100/40'
              }`}
            />
          ))}

          {/* Month Days */}
          {monthDays.map((dateStr) => {
            const status = getDayStatus(dateStr);
            const dateObj = new Date(dateStr);
            const dayNum = dateObj.getDate();
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 relative ${
                  isToday
                    ? isDark
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 text-emerald-300'
                      : 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10 text-emerald-800'
                    : isDark
                    ? 'border-emerald-900/40 bg-[#031f17] hover:border-emerald-500/50 hover:bg-emerald-950/60 text-slate-200'
                    : 'border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className={isToday ? (isDark ? 'text-emerald-300 font-extrabold' : 'text-emerald-700 font-extrabold') : ''}>
                    {dayNum}
                  </span>
                  
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      status === 'full'
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/50'
                        : status === 'partial'
                        ? 'bg-amber-500'
                        : status === 'missed'
                        ? 'bg-rose-500'
                        : isDark
                        ? 'bg-emerald-900/60'
                        : 'bg-slate-300'
                    }`}
                  />
                </div>

                <div className="text-[10px] font-extrabold hidden sm:block">
                  {status === 'full' && <span className="text-emerald-500">✓ All Taken</span>}
                  {status === 'partial' && <span className="text-amber-500">Partial</span>}
                  {status === 'missed' && <span className="text-rose-500">✕ Missed</span>}
                  {status === 'none' && <span className={isDark ? 'text-emerald-900/60' : 'text-slate-400'}>-</span>}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Date Detail Drawer Modal */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`max-w-lg w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border ${
            isDark
              ? 'bg-[#07281f] border-emerald-800 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isDark ? 'border-emerald-900/40' : 'border-slate-200'
            }`}>
              <h3 className="text-xl font-extrabold">
                Dose Logs for {selectedDateStr}
              </h3>
              <button
                onClick={() => setSelectedDateStr(null)}
                className={`text-xs font-extrabold p-1 cursor-pointer ${
                  isDark ? 'text-emerald-300/60 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              {getLogsForDate(selectedDateStr).length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className={`text-xs font-medium ${isDark ? 'text-emerald-200/60' : 'text-slate-500'}`}>
                    No dose records logged for this date.
                  </p>
                </div>
              ) : (
                getLogsForDate(selectedDateStr).map((l) => (
                  <div
                    key={l.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                      isDark
                        ? 'bg-[#031f17] border-emerald-900/40'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-extrabold">{l.medicineName}</h4>
                      <span className={isDark ? 'text-emerald-200/70' : 'text-slate-500'}>
                        Scheduled: {l.scheduledTime}
                      </span>
                    </div>
                    {l.status === 'taken' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold shadow-sm">
                        ✓ Taken ({l.timestamp})
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-extrabold shadow-sm">
                        ✕ Ignored
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedDateStr(null)}
              className="w-full py-3 rounded-2xl btn-secondary-visible text-xs font-extrabold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
