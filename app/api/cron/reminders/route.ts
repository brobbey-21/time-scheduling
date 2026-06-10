import { NextResponse } from 'next/server';
import { deliverDueReminders } from '@/lib/push-delivery';
import {
  getUserPushStore,
  listPushUserIds,
  saveUserPushStore,
} from '@/lib/push-storage';
import { isVapidConfigured } from '@/lib/vapid';

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
  let removedSubscriptions = 0;

  for (const userId of userIds) {
    const store = await getUserPushStore(userId);
    if (store.subscriptions.length === 0) continue;

    const result = await deliverDueReminders(store, now);
    sentCount += result.sentCount;
    pendingTotal += result.pendingCount;
    removedSubscriptions += result.removedSubscriptions;
    await saveUserPushStore(userId, store);
  }

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    pending: pendingTotal,
    users: userIds.length,
    removedSubscriptions,
  });
}
