import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { isVapidConfigured } from '@/lib/vapid';
import { getUserPushStore, isPushStoragePersistent } from '@/lib/push-storage';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await getUserPushStore(user.id);
  const now = Date.now();

  const pending = store.reminders.filter((r) => {
    if (r.sent) return false;
    return new Date(r.fireAt).getTime() > now;
  });

  const dueSoon = pending.filter((r) => {
    const fireAt = new Date(r.fireAt).getTime();
    return fireAt - now <= 24 * 60 * 60 * 1000;
  });

  return NextResponse.json({
    pushConfigured: isVapidConfigured(),
    subscriptions: store.subscriptions.length,
    totalReminders: store.reminders.length,
    pendingReminders: pending.length,
    dueNext24h: dueSoon.length,
    lastScheduleSync: store.updatedAt || null,
    storagePersistent: isPushStoragePersistent(),
  });
}
