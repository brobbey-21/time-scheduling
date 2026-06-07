import { NextResponse } from 'next/server';
import { getPushStore, savePushStore } from '@/lib/push-storage';
import { isVapidConfigured, sendWebPush } from '@/lib/vapid';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isVapidConfigured()) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 });
  }

  const store = await getPushStore();
  const now = Date.now();
  let sentCount = 0;
  const staleIds = new Set<string>();

  for (const reminder of store.reminders) {
    const fireAt = new Date(reminder.fireAt).getTime();

    if (reminder.sent) continue;

    if (fireAt <= now) {
      const payload = {
        title: reminder.title,
        body: reminder.body,
        url: reminder.url,
        tag: reminder.tag,
      };

      const results = await Promise.allSettled(
        store.subscriptions.map((sub) => sendWebPush(sub, payload))
      );

      if (results.some((r) => r.status === 'fulfilled')) {
        reminder.sent = true;
        sentCount += 1;
      }
    }

    if (fireAt < now - 60 * 60 * 1000) {
      staleIds.add(reminder.id);
    }
  }

  store.reminders = store.reminders.filter((r) => !staleIds.has(r.id));
  await savePushStore(store);

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    pending: store.reminders.filter((r) => !r.sent).length,
    subscriptions: store.subscriptions.length,
  });
}
