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
  syncPushScheduleWithRetry,
  verifyPushSubscription,
  waitForServiceWorker,
} from '@/lib/push-client';

const BACKGROUND_RESYNC_MS = 5 * 60 * 1000;
const VISIBLE_RESYNC_MS = 2 * 60 * 1000;

export default function NotificationScheduler() {
  const running = useRef(false);
  const visibleInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      const enabled = await getSetting('notificationsEnabled', true);
      if (!enabled) {
        clearScheduledNotifications();
        return;
      }

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission !== 'granted'
      ) {
        clearScheduledNotifications();
        return;
      }

      await waitForServiceWorker();

      const [classes, todos, options] = await Promise.all([
        getAllClasses(),
        getAllTodos(),
        loadReminderOptions(),
      ]);

      await refreshNotificationSchedule(classes, todos, options);

      if (isPushConfigured() && typeof Notification !== 'undefined') {
        const subscribed = await subscribeToPush();
        if (subscribed) {
          const reminders = buildPushReminders(classes, todos, options);
          await syncPushScheduleWithRetry(reminders, 3);
        }

        const verified = await verifyPushSubscription();
        if (!verified) {
          console.warn('[Push] Subscription not verified on server, will retry next cycle');
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('push-schedule-synced'));
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void sync(), 500);
    const backgroundInterval = setInterval(() => void sync(), BACKGROUND_RESYNC_MS);

    const startVisibleInterval = () => {
      if (visibleInterval.current) return;
      visibleInterval.current = setInterval(() => void sync(), VISIBLE_RESYNC_MS);
    };

    const stopVisibleInterval = () => {
      if (!visibleInterval.current) return;
      clearInterval(visibleInterval.current);
      visibleInterval.current = null;
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void sync();
        startVisibleInterval();
      } else {
        stopVisibleInterval();
      }
    };

    const onFocus = () => void sync();
    const onOnline = () => void sync();

    if (document.visibilityState === 'visible') {
      startVisibleInterval();
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('notifications-changed', sync);
    window.addEventListener('classes-changed', sync);
    window.addEventListener('todos-changed', sync);

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_EXPIRED') {
        void sync();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(backgroundInterval);
      stopVisibleInterval();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('notifications-changed', sync);
      window.removeEventListener('classes-changed', sync);
      window.removeEventListener('todos-changed', sync);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
      clearScheduledNotifications();
    };
  }, [sync]);

  return null;
}
