import {
  isDeadSubscriptionError,
  isDueForPush,
  reminderKey,
  shouldPruneReminder,
} from './push-reliability';
import type { PushStore } from './push-types';
import { sendWebPush } from './vapid';

export interface DeliveryResult {
  sentCount: number;
  pendingCount: number;
  removedSubscriptions: number;
}

export async function deliverDueReminders(
  store: PushStore,
  now = Date.now()
): Promise<DeliveryResult> {
  let sentCount = 0;
  const staleKeys = new Set<string>();
  const survivingSubscriptions = [...store.subscriptions];
  let removedSubscriptions = 0;

  for (const reminder of store.reminders) {
    if (shouldPruneReminder(reminder, now)) {
      staleKeys.add(reminderKey(reminder));
      continue;
    }

    if (!isDueForPush(reminder, now)) continue;

    const payload = {
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      tag: reminder.tag,
      requireInteraction: reminder.requireInteraction,
    };

    let delivered = false;
    const nextSubscriptions: PushSubscriptionJSON[] = [];

    for (const sub of survivingSubscriptions) {
      try {
        await sendWebPush(sub, payload);
        delivered = true;
        nextSubscriptions.push(sub);
      } catch (error) {
        if (isDeadSubscriptionError(error)) {
          removedSubscriptions += 1;
        } else {
          nextSubscriptions.push(sub);
        }
      }
    }

    survivingSubscriptions.length = 0;
    survivingSubscriptions.push(...nextSubscriptions);

    if (delivered) {
      reminder.sent = true;
      sentCount += 1;
    }
  }

  store.subscriptions = survivingSubscriptions;
  store.reminders = store.reminders.filter((r) => !staleKeys.has(reminderKey(r)));

  const pendingCount = store.reminders.filter((r) => !r.sent).length;
  return { sentCount, pendingCount, removedSubscriptions };
}
