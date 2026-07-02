'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Info,
  RefreshCw,
} from 'lucide-react';
import Toggle from '@/components/Toggle';
import { getSetting, setSetting } from '@/lib/db';
import {
  fetchPushStatus,
  forceResubscribe,
  isPushConfigured,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-client';
import {
  getNotificationPermission,
  getNotificationStatus,
  notifyScheduleRefresh,
  requestNotificationPermission,
  sendTestNotification,
} from '@/lib/notifications';

export default function NotificationsSection() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultReminder, setDefaultReminder] = useState(10);
  const [defaultTaskReminder, setDefaultTaskReminder] = useState('18:00');
  const [endOfDayEnabled, setEndOfDayEnabled] = useState(true);
  const [endOfDayTime, setEndOfDayTime] = useState('21:00');
  const [permission, setPermission] = useState<string>('default');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [swReady, setSwReady] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshingPush, setRefreshingPush] = useState(false);
  const [pushServerPending, setPushServerPending] = useState<number | null>(null);
  const [pushServerSubscriptions, setPushServerSubscriptions] = useState<number | null>(null);
  const [pushLastSync, setPushLastSync] = useState<number | null>(null);
  const [pushStoragePersistent, setPushStoragePersistent] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const pushConfigured = isPushConfigured();

  const refreshStatus = async () => {
    const enabled = await getSetting('notificationsEnabled', true);
    setNotificationsEnabled(enabled);
    setPermission(getNotificationPermission());

    const status = await getNotificationStatus(enabled);
    setScheduledCount(status.scheduledCount);
    setSwReady(status.serviceWorkerReady);

    if (pushConfigured && enabled) {
      const pushStatus = await fetchPushStatus();
      if (pushStatus) {
        setPushServerPending(pushStatus.pendingReminders);
        setPushServerSubscriptions(pushStatus.subscriptions);
        setPushLastSync(pushStatus.lastScheduleSync);
        setPushStoragePersistent(pushStatus.storagePersistent);
      }
    } else {
      setPushServerPending(null);
      setPushServerSubscriptions(null);
      setPushLastSync(null);
      setPushStoragePersistent(true);
    }
  };

  useEffect(() => {
    getSetting('defaultReminderMins', 10).then(setDefaultReminder);
    getSetting('defaultTaskReminderTime', '18:00').then(setDefaultTaskReminder);
    getSetting('endOfDayReminderEnabled', true).then(setEndOfDayEnabled);
    getSetting('endOfDayReminderTime', '21:00').then(setEndOfDayTime);
    refreshStatus();

    const onChange = () => refreshStatus();
    window.addEventListener('notifications-changed', onChange);
    window.addEventListener('push-schedule-synced', onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener('notifications-changed', onChange);
      window.removeEventListener('push-schedule-synced', onChange);
      window.removeEventListener('focus', onChange);
    };
  }, []);

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result !== 'granted') return;

    await setSetting('notificationsEnabled', true);
    setNotificationsEnabled(true);
    if (pushConfigured) {
      await subscribeToPush();
    }
    notifyScheduleRefresh();
    await refreshStatus();
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      await enableNotifications();
      return;
    }

    await setSetting('notificationsEnabled', false);
    setNotificationsEnabled(false);
    if (pushConfigured) {
      await unsubscribeFromPush();
    }
    notifyScheduleRefresh();
    await refreshStatus();
  };

  const handleTestNotification = async () => {
    setTesting(true);
    if (permission !== 'granted') {
      await enableNotifications();
    }
    if (pushConfigured) {
      await sendTestPush();
    }
    await sendTestNotification();
    notifyScheduleRefresh();
    await refreshStatus();
    setTesting(false);
  };

  const handleRefreshPushSchedule = async () => {
    setRefreshingPush(true);
    if (pushConfigured) {
      await forceResubscribe();
    }
    notifyScheduleRefresh();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await refreshStatus();
    setRefreshingPush(false);
  };

  const handleReconnectPush = async () => {
    setReconnecting(true);
    if (pushConfigured) {
      await forceResubscribe();
    }
    notifyScheduleRefresh();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await refreshStatus();
    setReconnecting(false);
  };

  const permissionLabel =
    permission === 'granted'
      ? 'Allowed'
      : permission === 'denied'
        ? 'Blocked'
        : permission === 'unsupported'
          ? 'Not supported'
          : 'Not asked yet';

  return (
    <section className="mb-6">
      <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Notifications</p>
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body">Enable Notifications</p>
            <p className="text-caption mt-1 text-[var(--text-secondary)]">
              Reminders before classes and timed tasks
            </p>
          </div>
          <Toggle
            enabled={notificationsEnabled && permission === 'granted'}
            onChange={toggleNotifications}
          />
        </div>

        <div className="space-y-2 rounded-xl bg-[var(--bg-base)] p-3">
          <div className="flex items-center justify-between text-caption">
            <span className="text-[var(--text-secondary)]">Permission</span>
            <span
              className={
                permission === 'granted'
                  ? 'font-medium text-[var(--success-text)]'
                  : permission === 'denied'
                    ? 'font-medium text-[var(--danger-text)]'
                    : 'text-[var(--text-tertiary)]'
              }
            >
              {permissionLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-caption">
            <span className="text-[var(--text-secondary)]">Local timers (14 days)</span>
            <span className="font-medium text-[var(--text-primary)]">
              {scheduledCount} active
            </span>
          </div>
          {pushConfigured && pushServerPending !== null && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Server push queue</span>
              <span className="font-medium text-[var(--text-primary)]">
                {pushServerPending} pending
              </span>
            </div>
          )}
          {pushConfigured && pushServerSubscriptions !== null && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Push devices</span>
              <span
                className={
                  pushServerSubscriptions > 0
                    ? 'font-medium text-[var(--success-text)]'
                    : 'font-medium text-[var(--danger-text)]'
                }
              >
                {pushServerSubscriptions > 0
                  ? `${pushServerSubscriptions} registered`
                  : 'None — tap Reconnect below'}
              </span>
            </div>
          )}
          {pushConfigured && !pushStoragePersistent && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Server storage</span>
              <span className="font-medium text-[var(--danger-text)]">
                Ephemeral — add Redis for production
              </span>
            </div>
          )}
          {pushLastSync !== null && pushLastSync > 0 && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Last server sync</span>
              <span className="font-medium text-[var(--text-primary)]">
                {new Date(pushLastSync).toLocaleString()}
              </span>
            </div>
          )}
          {pushConfigured && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Web Push (VAPID)</span>
              <span className="font-medium text-[var(--success-text)]">Configured</span>
            </div>
          )}
          {process.env.NODE_ENV === 'production' && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Service worker</span>
              <span
                className={
                  swReady ? 'font-medium text-[var(--success-text)]' : 'text-[var(--text-tertiary)]'
                }
              >
                {swReady ? 'Active' : 'Starting…'}
              </span>
            </div>
          )}
        </div>

        {permission === 'default' && (
          <button
            type="button"
            onClick={enableNotifications}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white"
          >
            <Bell size={18} />
            Allow Notifications
          </button>
        )}

        {permission === 'denied' && (
          <div className="flex gap-2 rounded-xl bg-[var(--danger-bg)] p-3">
            <BellOff size={16} className="mt-0.5 shrink-0 text-[var(--danger-text)]" />
            <p className="text-caption text-[var(--danger-text)]">
              Notifications are blocked. Open your browser or phone settings and
              allow notifications for this app.
            </p>
          </div>
        )}

        {permission === 'granted' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold shadow-sm"
            >
              <CheckCircle2 size={18} className="text-accent" />
              {testing ? 'Sending…' : 'Send Test Notification'}
            </button>
            <button
              type="button"
              onClick={handleRefreshPushSchedule}
              disabled={refreshingPush}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold shadow-sm"
            >
              <RefreshCw
                size={18}
                className={`text-accent ${refreshingPush ? 'animate-spin' : ''}`}
              />
              {refreshingPush ? 'Refreshing…' : 'Refresh notification schedule'}
            </button>
            {pushConfigured && pushServerSubscriptions === 0 && (
              <button
                type="button"
                onClick={handleReconnectPush}
                disabled={reconnecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white"
              >
                <RefreshCw
                  size={18}
                  className={reconnecting ? 'animate-spin' : ''}
                />
                {reconnecting ? 'Reconnecting…' : 'Reconnect push notifications'}
              </button>
            )}
          </div>
        )}

        {permission === 'granted' && pushConfigured && (
          <div className="flex gap-2 rounded-xl bg-[var(--bg-base)] p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-[var(--text-tertiary)]" />
            <p className="text-caption text-[var(--text-secondary)]">
              For reliable alerts when the app is closed, add Class Time to your home
              screen (especially on iPhone) and tap Reconnect if push devices show 0.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="text-body">Class reminder</span>
          <select
            value={defaultReminder}
            onChange={async (e) => {
              const val = parseInt(e.target.value, 10);
              setDefaultReminder(val);
              await setSetting('defaultReminderMins', val);
              notifyScheduleRefresh();
            }}
            className="text-caption bg-transparent text-[var(--text-secondary)] outline-none"
          >
            {[5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>
                {m} min before class
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="text-body">Default task reminder</span>
          <input
            type="time"
            value={defaultTaskReminder}
            onChange={async (e) => {
              setDefaultTaskReminder(e.target.value);
              await setSetting('defaultTaskReminderTime', e.target.value);
              notifyScheduleRefresh();
            }}
            className="text-caption bg-transparent text-[var(--text-secondary)] outline-none"
          />
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div>
            <p className="text-body">End-of-day summary</p>
            <p className="text-caption text-[var(--text-secondary)]">
              Nudge when tasks are still pending
            </p>
          </div>
          <Toggle
            enabled={endOfDayEnabled}
            onChange={async () => {
              const next = !endOfDayEnabled;
              setEndOfDayEnabled(next);
              await setSetting('endOfDayReminderEnabled', next);
              notifyScheduleRefresh();
            }}
          />
        </div>

        {endOfDayEnabled && (
          <div className="flex items-center justify-between">
            <span className="text-caption text-[var(--text-secondary)]">Summary time</span>
            <input
              type="time"
              value={endOfDayTime}
              onChange={async (e) => {
                setEndOfDayTime(e.target.value);
                await setSetting('endOfDayReminderTime', e.target.value);
                notifyScheduleRefresh();
              }}
              className="text-caption bg-transparent text-[var(--text-secondary)] outline-none"
            />
          </div>
        )}
      </div>
    </section>
  );
}
