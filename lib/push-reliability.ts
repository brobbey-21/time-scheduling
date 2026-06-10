import type { ScheduledPushReminder } from './push-types';

/** Still deliver if cron was slightly late. */
export const PUSH_LATE_GRACE_MS = 3 * 60 * 60 * 1000;

/** Drop sent reminders after this age. */
export const PUSH_SENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Drop unsent reminders that are far past due. */
export const PUSH_MISSED_RETENTION_MS = 48 * 60 * 60 * 1000;

export function reminderKey(reminder: Pick<ScheduledPushReminder, 'id' | 'fireAt'>): string {
  return `${reminder.id}|${reminder.fireAt}`;
}

export function mergePushReminders(
  existing: ScheduledPushReminder[],
  incoming: ScheduledPushReminder[]
): ScheduledPushReminder[] {
  const sentKeys = new Set(
    existing.filter((r) => r.sent).map((r) => reminderKey(r))
  );

  return incoming.map((r) => ({
    ...r,
    sent: sentKeys.has(reminderKey(r)),
  }));
}

export function shouldPruneReminder(
  reminder: ScheduledPushReminder,
  now: number
): boolean {
  const fireAt = new Date(reminder.fireAt).getTime();

  if (reminder.sent && fireAt < now - PUSH_SENT_RETENTION_MS) {
    return true;
  }

  if (!reminder.sent && fireAt < now - PUSH_MISSED_RETENTION_MS) {
    return true;
  }

  return false;
}

export function isDueForPush(
  reminder: ScheduledPushReminder,
  now: number
): boolean {
  if (reminder.sent) return false;
  const fireAt = new Date(reminder.fireAt).getTime();
  return fireAt <= now && fireAt >= now - PUSH_LATE_GRACE_MS;
}

export function isDeadSubscriptionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { statusCode?: number }).statusCode;
  return code === 410 || code === 404;
}
