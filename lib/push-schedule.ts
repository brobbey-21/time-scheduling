import type { ClassEntry, TodoEntry } from './types';
import type { ScheduledPushReminder } from './push-types';
import {
  buildAllReminders,
  type ReminderScheduleOptions,
} from './reminder-schedule';

export function buildPushReminders(
  classes: ClassEntry[],
  todos: TodoEntry[],
  options: ReminderScheduleOptions = {}
): ScheduledPushReminder[] {
  return buildAllReminders(classes, todos, options).map((slot) => ({
    id: slot.id,
    fireAt: slot.fireAt.toISOString(),
    title: slot.title,
    body: slot.body,
    url: slot.url,
    tag: slot.tag,
    requireInteraction: slot.requireInteraction,
  }));
}
