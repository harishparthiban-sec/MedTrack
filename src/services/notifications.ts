import type { MedicineScheduleItem } from '../types';

// Web Audio API chimes (works reliably without external audio asset downloads)
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Play a pleasant 2-tone melodic notification chime
export const playReminderSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, gainLevel: number = 0.18) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainLevel, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Uplifting medical chime (E5 -> G#5 -> B5)
    playTone(659.25, now, 0.22, 0.15);         // E5
    playTone(830.61, now + 0.14, 0.25, 0.18);  // G#5
    playTone(987.77, now + 0.30, 0.45, 0.20);  // B5
  } catch (err) {
    console.warn('Web Audio alert error:', err);
  }
};

// Play short celebratory chime when dose is marked taken
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25); // C6

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn('Web Audio success error:', err);
  }
};

// Query browser notification permission status
export const getNotificationPermissionStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Request native browser desktop notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return false;
};

// Send native OS desktop / browser notification
export const sendDesktopNotification = (item: MedicineScheduleItem) => {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(`MedTrack Reminder: ${item.name}`, {
      body: `Dosage: ${item.dosage} • Scheduled for ${item.time} (${item.timingInstruction})`,
      icon: '/favicon.svg',
      tag: `med-reminder-${item.id}`,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.error('Desktop notification error:', err);
  }
};

// Read reminder text aloud via Web Speech API
export const speakReminderText = (text: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel(); // cancel any active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
};

// Converts human time string like "09:00 AM", "2:30 PM", "14:00" into minutes from midnight
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/(\d+):(\d+)\s*(AM|PM)?/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Check if a dose time is due given current time (within tolerance window or overdue today)
export const isDoseDueNow = (scheduleTime: string, currentMinutes: number, windowToleranceMinutes: number = 45): boolean => {
  const schedMinutes = parseTimeToMinutes(scheduleTime);
  // Due if current time is within +/- tolerance or past due earlier today
  return currentMinutes >= schedMinutes - 5 && currentMinutes <= schedMinutes + windowToleranceMinutes;
};
