import { NextResponse } from 'next/server';
import { getPushStore } from '@/lib/push-storage';
import { isVapidConfigured, sendWebPush } from '@/lib/vapid';

export async function POST() {
  if (!isVapidConfigured()) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 503 });
  }

  const store = await getPushStore();
  if (store.subscriptions.length === 0) {
    return NextResponse.json({ error: 'No push subscription' }, { status: 404 });
  }

  const payload = {
    title: 'Notifications are working',
    body: 'Push reminders are active for your classes and tasks.',
    url: '/settings',
    tag: 'test-push',
  };

  const results = await Promise.allSettled(
    store.subscriptions.map((sub) => sendWebPush(sub, payload))
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ ok: sent > 0, sent, total: store.subscriptions.length });
}
