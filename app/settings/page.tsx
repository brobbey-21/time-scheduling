'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Info,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { syncAllClasses } from '@/lib/class-sync';
import PageHeader from '@/components/PageHeader';
import {
  clearAllTodos,
  getAllClasses,
  getSetting,
  getTodosByDate,
  setSetting,
} from '@/lib/db';
import {
  isPushConfigured,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-client';
import {
  getNotificationPermission,
  getNotificationStatus,
  getUpcomingClassCount,
  notifyScheduleRefresh,
  requestNotificationPermission,
  sendTestNotification,
} from '@/lib/notifications';
import { THEME_OPTIONS, loadTheme, saveTheme, type AppTheme } from '@/lib/theme';
import { toDateString } from '@/lib/utils';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  cohort: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultReminder, setDefaultReminder] = useState(10);
  const [permission, setPermission] = useState<string>('default');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [swReady, setSwReady] = useState(false);
  const [testing, setTesting] = useState(false);
  const [appTheme, setAppTheme] = useState<AppTheme>('light');
  const [syncing, setSyncing] = useState(false);
  const pushConfigured = isPushConfigured();

  const refreshStatus = useCallback(async () => {
    const enabled = await getSetting('notificationsEnabled', true);
    setNotificationsEnabled(enabled);
    setPermission(getNotificationPermission());

    const status = await getNotificationStatus(enabled);
    setScheduledCount(status.scheduledCount);
    setSwReady(status.serviceWorkerReady);

    const [classes, todos] = await Promise.all([
      getAllClasses(),
      getTodosByDate(toDateString()),
    ]);
    setUpcomingCount(getUpcomingClassCount(classes) + todos.filter((t) => !t.completed && t.reminderTime).length);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
    getSetting('defaultReminderMins', 10).then(setDefaultReminder);
    loadTheme().then(setAppTheme);
    refreshStatus();

    const onChange = () => refreshStatus();
    const onThemeChange = (e: Event) => {
      setAppTheme((e as CustomEvent<AppTheme>).detail);
    };
    window.addEventListener('notifications-changed', onChange);
    window.addEventListener('focus', onChange);
    window.addEventListener('theme-changed', onThemeChange);
    return () => {
      window.removeEventListener('notifications-changed', onChange);
      window.removeEventListener('focus', onChange);
      window.removeEventListener('theme-changed', onThemeChange);
    };
  }, [refreshStatus]);

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

  const handleClearTodos = async () => {
    if (confirm('Clear all todos? This cannot be undone.')) {
      await clearAllTodos();
      notifyScheduleRefresh();
    }
  };

  const handleSyncSchedule = async () => {
    setSyncing(true);
    await syncAllClasses();
    notifyScheduleRefresh();
    await refreshStatus();
    setSyncing(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
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
    <main className="px-5 pt-8 pb-8">
      <PageHeader title="Settings" />

      {user && (
        <section className="mb-6">
          <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
            Account
          </p>
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-light)]">
                <User size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-body truncate">{user.name}</p>
                <p className="text-caption truncate text-[var(--text-secondary)]">
                  {user.email} · {user.cohort}
                </p>
                {user.role === 'admin' && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro font-semibold text-accent">
                    <Shield size={10} />
                    Admin
                  </span>
                )}
              </div>
            </div>
            {user.role === 'admin' && (
              <div className="space-y-2">
                <Link
                  href="/admin"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white"
                >
                  <Shield size={18} />
                  Admin Panel
                </Link>
                <Link
                  href="/admin/users"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold"
                >
                  View Members & Assign Admins
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold text-[var(--danger-text)]"
            >
              <LogOut size={18} />
              {loggingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </section>
      )}

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
          Notifications
        </p>
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-body">Enable Notifications</p>
              <p className="text-caption mt-1 text-[var(--text-secondary)]">
                Reminders before classes and timed tasks
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled && permission === 'granted'}
              onClick={toggleNotifications}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                notificationsEnabled && permission === 'granted'
                  ? 'bg-accent'
                  : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  notificationsEnabled && permission === 'granted'
                    ? 'left-[22px]'
                    : 'left-0.5'
                }`}
              />
            </button>
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
              <span className="text-[var(--text-secondary)]">Scheduled today</span>
              <span className="font-medium text-[var(--text-primary)]">
                {scheduledCount} active
              </span>
            </div>
            <div className="flex items-center justify-between text-caption">
              <span className="text-[var(--text-secondary)]">Upcoming reminders</span>
              <span className="font-medium text-[var(--text-primary)]">
                {upcomingCount}
              </span>
            </div>
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
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold shadow-sm"
            >
              <CheckCircle2 size={18} className="text-accent" />
              {testing ? 'Sending…' : 'Send Test Notification'}
            </button>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <span className="text-body">Default Reminder</span>
            <select
              value={defaultReminder}
              onChange={async (e) => {
                const val = parseInt(e.target.value, 10);
                setDefaultReminder(val);
                await setSetting('defaultReminderMins', val);
              }}
              className="text-caption bg-transparent text-[var(--text-secondary)] outline-none"
            >
              {[5, 10, 15, 30].map((m) => (
                <option key={m} value={m}>
                  {m} minutes before
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
          Appearance
        </p>
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-2">
            {appTheme === 'dark' ? (
              <Moon size={16} className="text-[var(--text-secondary)]" />
            ) : appTheme === 'system' ? (
              <Monitor size={16} className="text-[var(--text-secondary)]" />
            ) : (
              <Sun size={16} className="text-[var(--text-secondary)]" />
            )}
            <span className="text-body">App Theme</span>
          </div>
          <select
            value={appTheme}
            onChange={async (e) => {
              const theme = e.target.value as AppTheme;
              setAppTheme(theme);
              await saveTheme(theme);
            }}
            className="text-caption bg-transparent text-[var(--text-secondary)] outline-none"
          >
            {THEME_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
          Data
        </p>
        <div className="card divide-y divide-[var(--border)]">
          <button
            type="button"
            onClick={handleSyncSchedule}
            disabled={syncing}
            className="flex w-full items-center gap-2 py-3 text-left"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin text-accent' : 'text-accent'} />
            <span className="text-body">
              {syncing ? 'Syncing…' : 'Refresh Class Schedule'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleClearTodos}
            className="flex w-full items-center gap-2 py-3 text-left text-[var(--danger-text)]"
          >
            <Trash2 size={16} />
            <span className="text-body">Clear All Todos</span>
          </button>
        </div>
      </section>

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
          About
        </p>
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-[var(--text-secondary)]" />
              <span className="text-body">App Version</span>
            </div>
            <span className="text-caption text-[var(--text-tertiary)]">1.0.0</span>
          </div>
          <p className="text-caption text-[var(--text-secondary)]">
            MN 3C · UMaT Semester 2, 2026
          </p>
        </div>
      </section>

      <section>
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
          iOS Tip
        </p>
        <div className="card flex gap-3">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-caption text-[var(--text-secondary)]">
            On iPhone, tap Share → Add to Home Screen, then open the app and allow
            notifications in Settings. Reminders resync each time you open the app.
          </p>
        </div>
      </section>

      <section>
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">
          Offline
        </p>
        <div className="card flex gap-3">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-caption text-[var(--text-secondary)]">
            Open the app once while online to cache it. Your timetable and todos
            sync to your account across phone and computer when you sign in.
          </p>
        </div>
      </section>
    </main>
  );
}
