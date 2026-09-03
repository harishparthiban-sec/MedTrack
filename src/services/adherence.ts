import type { AdherenceLog } from '../types';

/**
 * Calculates the consecutive daily medicine adherence streak.
 * 
 * Rules:
 * 1. Collects all unique calendar dates (YYYY-MM-DD) on which the user took medication (status === 'taken').
 * 2. Checks days backwards from today.
 * 3. If today has at least one 'taken' dose:
 *    - Start counting from today, then check yesterday (day - 1), day - 2, etc.
 * 4. If today has no 'taken' dose yet (e.g. earlier in the day or pending doses):
 *    - Check yesterday. If yesterday has at least one 'taken' dose, the streak is alive!
 *      Count backwards from yesterday.
 *    - If neither today nor yesterday has any taken dose: the streak is 0.
 * 5. Returns 0 for new accounts with no logs.
 */
export const calculateAdherenceStreak = (logs: AdherenceLog[]): number => {
  if (!logs || logs.length === 0) return 0;

  // Set of dates (YYYY-MM-DD) where the user has at least one 'taken' dose
  const takenDates = new Set<string>();
  for (const log of logs) {
    if (log.status === 'taken' && log.date) {
      takenDates.add(log.date);
    }
  }

  if (takenDates.size === 0) return 0;

  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayStr = formatYMD(now);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatYMD(yesterdayDate);

  let streak = 0;
  let checkDate: Date;

  if (takenDates.has(todayStr)) {
    // Took medication today
    streak = 1;
    checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - 1);
  } else if (takenDates.has(yesterdayStr)) {
    // Took medication yesterday, today is still in progress
    streak = 1;
    checkDate = new Date(yesterdayDate);
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // Neither today nor yesterday had taken doses -> streak is 0
    return 0;
  }

  // Count backwards day by day for consecutive days
  while (true) {
    const dateStr = formatYMD(checkDate);
    if (takenDates.has(dateStr)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};
