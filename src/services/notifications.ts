import type { MedicineScheduleItem } from '../types';

// Request native browser desktop notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Send native OS desktop / browser notification
export const sendDesktopNotification = (item: MedicineScheduleItem) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(`💊 Time to take ${item.name}`, {
      body: `${item.dosage} • Scheduled: ${item.time} (${item.timingInstruction})`,
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
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // cancel any active speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};
