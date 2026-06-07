import { NextResponse } from 'next/server';
import { getPushStore, savePushStore } from '@/lib/push-storage';

export async function POST(request: Request) {
  try {
    const subscription = (await request.json()) as PushSubscriptionJSON;
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const store = await getPushStore();
    const exists = store.subscriptions.some(
      (s) => s.endpoint === subscription.endpoint
    );

    if (!exists) {
      store.subscriptions.push(subscription);
    } else {
      store.subscriptions = store.subscriptions.map((s) =>
        s.endpoint === subscription.endpoint ? subscription : s
      );
    }

    await savePushStore(store);
    return NextResponse.json({ ok: true, count: store.subscriptions.length });
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE() {
  const store = await getPushStore();
  store.subscriptions = [];
  await savePushStore(store);
  return NextResponse.json({ ok: true });
}
