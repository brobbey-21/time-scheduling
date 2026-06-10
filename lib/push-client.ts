'use client';

import type { ScheduledPushReminder } from './push-types';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export async function waitForServiceWorker(
  timeoutMs = 8000
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );
    return (await Promise.race([ready, timeout])) as ServiceWorkerRegistration | null;
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const registration = await waitForServiceWorker();
  if (!registration) return false;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription),
  });

  return res.ok;
}

export async function syncPushSchedule(
  reminders: ScheduledPushReminder[]
): Promise<boolean> {
  if (!isPushConfigured()) return false;

  try {
    const res = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reminders }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncPushScheduleWithRetry(
  reminders: ScheduledPushReminder[],
  attempts = 3
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    if (await syncPushSchedule(reminders)) return true;
    if (i < attempts - 1) await sleep(800 * (i + 1));
  }
  return false;
}

export async function fetchPushStatus(): Promise<{
  pushConfigured: boolean;
  subscriptions: number;
  pendingReminders: number;
  dueNext24h: number;
  lastScheduleSync: number | null;
} | null> {
  try {
    const res = await fetch('/api/push/status', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      pushConfigured: boolean;
      subscriptions: number;
      pendingReminders: number;
      dueNext24h: number;
      lastScheduleSync: number | null;
    };
  } catch {
    return null;
  }
}

export async function sendTestPush(): Promise<boolean> {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await waitForServiceWorker();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    return;
  }
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    credentials: 'include',
  });
}
