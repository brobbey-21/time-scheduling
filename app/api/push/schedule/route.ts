import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import type { ScheduledPushReminder } from '@/lib/push-types';
import { getUserPushStore, saveUserPushStore } from '@/lib/push-storage';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { reminders?: ScheduledPushReminder[] };
    const reminders = body.reminders ?? [];

    const store = await getUserPushStore(user.id);
    store.reminders = reminders.map((r) => ({ ...r, sent: false }));
    await saveUserPushStore(user.id, store);

    return NextResponse.json({ ok: true, count: reminders.length });
  } catch {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
