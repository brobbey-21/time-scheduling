import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { mergePushReminders } from '@/lib/push-reliability';
import type { ScheduledPushReminder } from '@/lib/push-types';
import { getUserPushStore, saveUserPushStore } from '@/lib/push-storage';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { reminders?: ScheduledPushReminder[] };
    const incoming = body.reminders ?? [];

    const store = await getUserPushStore(user.id);
    store.reminders = mergePushReminders(store.reminders, incoming);
    store.updatedAt = Date.now();
    await saveUserPushStore(user.id, store);

    const pending = store.reminders.filter((r) => !r.sent).length;
    return NextResponse.json({
      ok: true,
      count: store.reminders.length,
      pending,
      subscriptions: store.subscriptions.length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
