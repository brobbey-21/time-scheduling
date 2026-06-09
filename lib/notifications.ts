import type { ClassEntry, TodoEntry } from './types';
import {
  buildAllReminders,
  getUpcomingClassReminderCount,
  type ReminderScheduleOptions,
  type ReminderSlot,
} from './reminder-schedule';

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface NotificationStatus {
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  scheduledCount: number;
  serviceWorkerReady: boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowser() || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowser() || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.requestPermission();
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isBrowser() || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );
    return (await Promise.race([ready, timeout])) as ServiceWorkerRegistration | null;
  } catch {
    return null;
  }
}

async function dispatchNotification(
  slot: ReminderSlot
): Promise<void> {
  if (!isBrowser() || Notification.permission !== 'granted') return;

  const options = {
    body: slot.body,
    tag: slot.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    requireInteraction: slot.requireInteraction ?? false,
    vibrate: slot.requireInteraction ? [200, 100, 200] : [120],
    data: { url: slot.url },
  } as NotificationOptions & { data?: { url?: string } };

  const registration = await getServiceWorkerRegistration();
  if (registration) {
    await registration.showNotification(slot.title, options);
    return;
  }

  new Notification(slot.title, options);
}

export function clearScheduledNotifications(): void {
  scheduledTimers.forEach((timer) => clearTimeout(timer));
  scheduledTimers.clear();
}

function scheduleSlot(slot: ReminderSlot): boolean {
  const msUntil = slot.fireAt.getTime() - Date.now();
  if (msUntil <= 0) return false;

  const existing = scheduledTimers.get(slot.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    void dispatchNotification(slot);
  }, msUntil);
  scheduledTimers.set(slot.id, timer);
  return true;
}

export function scheduleReminderSlots(slots: ReminderSlot[]): number {
  if (!isBrowser() || Notification.permission !== 'granted') return 0;
  let count = 0;
  for (const slot of slots) {
    if (scheduleSlot(slot)) count += 1;
  }
  return count;
}

export async function sendTestNotification(): Promise<boolean> {
  if (getNotificationPermission() !== 'granted') return false;

  await dispatchNotification({
    id: 'test',
    fireAt: new Date(),
    title: 'Notifications are working',
    body: 'You will get class reminders, task alerts, and end-of-day summaries.',
    url: '/settings',
    tag: 'test-notification',
    requireInteraction: true,
  });
  return true;
}

export async function refreshNotificationSchedule(
  classes: ClassEntry[],
  todos: TodoEntry[],
  options: ReminderScheduleOptions = {}
): Promise<number> {
  clearScheduledNotifications();

  if (getNotificationPermission() !== 'granted') return 0;

  const slots = buildAllReminders(classes, todos, options);
  return scheduleReminderSlots(slots);
}

export function getUpcomingClassCount(classes: ClassEntry[]): number {
  return getUpcomingClassReminderCount(classes);
}

export async function getNotificationStatus(
  enabled: boolean
): Promise<NotificationStatus> {
  const registration = await getServiceWorkerRegistration();
  return {
    permission: getNotificationPermission(),
    enabled,
    scheduledCount: scheduledTimers.size,
    serviceWorkerReady: Boolean(registration?.active),
  };
}

export function notifyScheduleRefresh(): void {
  if (isBrowser()) {
    window.dispatchEvent(new Event('notifications-changed'));
  }
}

export async function loadReminderOptions(): Promise<ReminderScheduleOptions> {
  if (!isBrowser()) return {};
  const { getSetting } = await import('./db');
  const [endOfDayEnabled, endOfDayTime] = await Promise.all([
    getSetting('endOfDayReminderEnabled', true),
    getSetting('endOfDayReminderTime', '21:00'),
  ]);
  return {
    endOfDayEnabled: Boolean(endOfDayEnabled),
    endOfDayTime: String(endOfDayTime),
  };
}
