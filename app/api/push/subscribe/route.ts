import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import {
  getUserPushStore,
  removeUserPushSubscription,
  saveUserPushStore,
} from '@/lib/push-storage';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscription = (await request.json()) as PushSubscriptionJSON;
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const store = await getUserPushStore(user.id);
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

    await saveUserPushStore(user.id, store);
    return NextResponse.json({ ok: true, count: store.subscriptions.length });
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      endpoint?: string;
    };

    if (body.endpoint) {
      await removeUserPushSubscription(user.id, body.endpoint);
      return NextResponse.json({ ok: true });
    }

    const store = await getUserPushStore(user.id);
    store.subscriptions = [];
    await saveUserPushStore(user.id, store);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
