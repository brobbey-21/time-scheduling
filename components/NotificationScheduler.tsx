'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  getAllClasses,
  getSetting,
  getTodosByDate,
} from '@/lib/db';
import {
  clearScheduledNotifications,
  refreshNotificationSchedule,
} from '@/lib/notifications';
import { buildPushReminders } from '@/lib/push-schedule';
import {
  isPushConfigured,
  subscribeToPush,
  syncPushSchedule,
} from '@/lib/push-client';
import { toDateString } from '@/lib/utils';

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

      const dateStr = toDateString();
      const [classes, todos] = await Promise.all([
        getAllClasses(),
        getTodosByDate(dateStr),
      ]);

      await refreshNotificationSchedule(classes, todos);

      if (
        isPushConfigured() &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        await subscribeToPush();
        const reminders = buildPushReminders(classes, todos);
        await syncPushSchedule(reminders);
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(sync, 800);

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };

    const onFocus = () => sync();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications-changed', sync);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications-changed', sync);
      clearScheduledNotifications();
    };
  }, [sync]);

  return null;
}
