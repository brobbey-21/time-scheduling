'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  getAllClasses,
  getAllTodos,
  getSetting,
} from '@/lib/db';
import {
  clearScheduledNotifications,
  loadReminderOptions,
  refreshNotificationSchedule,
} from '@/lib/notifications';
import { buildPushReminders } from '@/lib/push-schedule';
import {
  isPushConfigured,
  subscribeToPush,
  syncPushSchedule,
} from '@/lib/push-client';

const RESYNC_INTERVAL_MS = 15 * 60 * 1000;

export default function NotificationScheduler() {
  const running = useRef(false);

  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      const enabled = await getSetting('notificationsEnabled', true);
      if (!enabled) {
        clearScheduledNotifications();
        return;
      }

      const [classes, todos, options] = await Promise.all([
        getAllClasses(),
        getAllTodos(),
        loadReminderOptions(),
      ]);

      await refreshNotificationSchedule(classes, todos, options);

      if (
        isPushConfigured() &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        await subscribeToPush();
        const reminders = buildPushReminders(classes, todos, options);
        await syncPushSchedule(reminders);
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(sync, 800);
    const interval = setInterval(sync, RESYNC_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };

    const onFocus = () => sync();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications-changed', sync);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications-changed', sync);
      clearScheduledNotifications();
    };
  }, [sync]);

  return null;
}
