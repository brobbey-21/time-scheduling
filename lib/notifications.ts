import type { ClassEntry, TodoEntry } from './types';
import { getDayNameFromDate, timeToMinutes, toDateString } from './utils';

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
      setTimeout(() => resolve(null), 3000)
    );
    return (await Promise.race([ready, timeout])) as ServiceWorkerRegistration | null;
  } catch {
    return null;
  }
}

function buildClassBody(cls: ClassEntry): string {
  const parts = [cls.courseName];
  if (cls.venue) parts.push(cls.venue);
  if (cls.lecturer) parts.push(cls.lecturer);
  return parts.join(' · ');
}

function buildClassTitle(cls: ClassEntry): string {
  const prefix =
    cls.type === 'CLASS_VLE'
      ? 'Online'
      : cls.type === 'PRACTICAL'
        ? 'Practical'
        : cls.type === 'STUDY'
          ? 'Study'
          : 'Class';
  return `${prefix}: ${cls.courseCode} in ${cls.notificationMinsBefore} mins`;
}

async function dispatchNotification(
  title: string,
  options: NotificationOptions & { data?: { url?: string } }
): Promise<void> {
  if (!isBrowser() || Notification.permission !== 'granted') return;

  const registration = await getServiceWorkerRegistration();
  if (registration) {
    await registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      ...options,
    });
    return;
  }

  new Notification(title, {
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    ...options,
  });
}

export function clearScheduledNotifications(): void {
  scheduledTimers.forEach((timer) => clearTimeout(timer));
  scheduledTimers.clear();
}

function scheduleAt(
  key: string,
  notifyAt: Date,
  onFire: () => void
): boolean {
  const msUntil = notifyAt.getTime() - Date.now();
  if (msUntil <= 0) return false;

  const existing = scheduledTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(onFire, msUntil);
  scheduledTimers.set(key, timer);
  return true;
}

function notifyTimeForClass(cls: ClassEntry): Date {
  const [h, m] = cls.startTime.split(':').map(Number);
  const notifyTime = new Date();
  notifyTime.setHours(h, m - cls.notificationMinsBefore, 0, 0);
  return notifyTime;
}

export function scheduleClassNotifications(classes: ClassEntry[]): number {
  if (!isBrowser() || Notification.permission !== 'granted') return 0;

  let count = 0;

  classes.forEach((cls) => {
    if (!cls.notificationEnabled) return;

    const notifyTime = notifyTimeForClass(cls);
    const meetingUrl =
      cls.type === 'CLASS_VLE' && cls.meetingUrl ? cls.meetingUrl : undefined;
    const scheduled = scheduleAt(`class-${cls.id}`, notifyTime, () => {
      void dispatchNotification(buildClassTitle(cls), {
        body: buildClassBody(cls),
        tag: `class-${cls.id}`,
        data: { url: meetingUrl ?? `/manage/${cls.id}` },
      });
    });

    if (scheduled) count += 1;
  });

  return count;
}

export function scheduleTodoNotifications(todos: TodoEntry[]): number {
  if (!isBrowser() || Notification.permission !== 'granted') return 0;

  let count = 0;

  todos.forEach((todo) => {
    if (todo.completed || !todo.reminderTime) return;

    const [h, m] = todo.reminderTime.split(':').map(Number);
    const notifyTime = new Date();
    notifyTime.setHours(h, m, 0, 0);

    const scheduled = scheduleAt(`todo-${todo.id}`, notifyTime, () => {
      void dispatchNotification('Task reminder', {
        body: todo.text,
        tag: `todo-${todo.id}`,
        data: { url: `/todos?date=${todo.date}` },
      });
    });

    if (scheduled) count += 1;
  });

  return count;
}

export async function sendTestNotification(): Promise<boolean> {
  if (getNotificationPermission() !== 'granted') return false;

  await dispatchNotification('Notifications are working', {
    body: 'You will get reminders before your classes and tasks.',
    tag: 'test-notification',
    data: { url: '/settings' },
  });
  return true;
}

export async function refreshNotificationSchedule(
  classes: ClassEntry[],
  todos: TodoEntry[]
): Promise<number> {
  clearScheduledNotifications();

  if (getNotificationPermission() !== 'granted') return 0;

  const today = getDayNameFromDate(new Date());
  const todayStr = toDateString();
  const todayClasses = classes.filter((c) => c.day === today);
  const todayTodos = todos.filter((t) => t.date === todayStr);

  const classCount = scheduleClassNotifications(todayClasses);
  const todoCount = scheduleTodoNotifications(todayTodos);

  return classCount + todoCount;
}

export function getUpcomingClassCount(classes: ClassEntry[]): number {
  const today = getDayNameFromDate(new Date());
  const nowMins = timeToMinutes(
    `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
  );

  return classes.filter((cls) => {
    if (cls.day !== today || !cls.notificationEnabled) return false;
    const notifyMins =
      timeToMinutes(cls.startTime) - cls.notificationMinsBefore;
    return notifyMins > nowMins;
  }).length;
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
