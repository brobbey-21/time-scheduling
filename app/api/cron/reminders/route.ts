import { NextResponse } from 'next/server';
import {
  getUserPushStore,
  listPushUserIds,
  saveUserPushStore,
} from '@/lib/push-storage';
import { isVapidConfigured, sendWebPush } from '@/lib/vapid';

const STALE_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isVapidConfigured()) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 });
  }

  const userIds = await listPushUserIds();
  const now = Date.now();
  let sentCount = 0;
  let pendingTotal = 0;

  for (const userId of userIds) {
    const store = await getUserPushStore(userId);
    const staleIds = new Set<string>();

    for (const reminder of store.reminders) {
      const fireAt = new Date(reminder.fireAt).getTime();

      if (!reminder.sent && fireAt <= now) {
        const payload = {
          title: reminder.title,
          body: reminder.body,
          url: reminder.url,
          tag: reminder.tag,
          requireInteraction: reminder.requireInteraction,
        };

        const results = await Promise.allSettled(
          store.subscriptions.map((sub) => sendWebPush(sub, payload))
        );

        if (results.some((r) => r.status === 'fulfilled')) {
          reminder.sent = true;
          sentCount += 1;
        }
      }

      if (fireAt < now - STALE_MS) {
        staleIds.add(reminder.id);
      }
    }

    store.reminders = store.reminders.filter((r) => !staleIds.has(r.id));
    pendingTotal += store.reminders.filter((r) => !r.sent).length;
    await saveUserPushStore(userId, store);
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    pending: pendingTotal,
    users: userIds.length,
  });
}
