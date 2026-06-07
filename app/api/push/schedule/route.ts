import { NextResponse } from 'next/server';
import type { ScheduledPushReminder } from '@/lib/push-types';
import { getPushStore, savePushStore } from '@/lib/push-storage';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reminders?: ScheduledPushReminder[] };
    const reminders = body.reminders ?? [];

    const store = await getPushStore();
    store.reminders = reminders.map((r) => ({ ...r, sent: false }));
    await savePushStore(store);

    return NextResponse.json({ ok: true, count: reminders.length });
  } catch {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
