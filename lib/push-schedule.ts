import type { ClassEntry, TodoEntry } from './types';
import type { ScheduledPushReminder } from './push-types';
import { getDayNameFromDate, toDateString } from './utils';

function buildClassTitle(cls: ClassEntry): string {
  const prefix =
    cls.type === 'CLASS_VLE'
      ? 'Online'
      : cls.type === 'PRACTICAL'
        ? 'Practical'
        : cls.type === 'STUDY'
          ? 'Study'
          : 'Class';
  return `${prefix}: ${cls.courseCode} in ${cls.notificationMinsBefore} mins`;
}

function buildClassBody(cls: ClassEntry): string {
  const parts = [cls.courseName];
  if (cls.venue) parts.push(cls.venue);
  if (cls.lecturer) parts.push(cls.lecturer);
  return parts.join(' · ');
}

function notifyTimeForClass(cls: ClassEntry): Date {
  const [h, m] = cls.startTime.split(':').map(Number);
  const notifyTime = new Date();
  notifyTime.setHours(h, m - cls.notificationMinsBefore, 0, 0);
  return notifyTime;
}

export function buildPushReminders(
  classes: ClassEntry[],
  todos: TodoEntry[]
): ScheduledPushReminder[] {
  const now = Date.now();
  const today = getDayNameFromDate(new Date());
  const todayStr = toDateString();
  const reminders: ScheduledPushReminder[] = [];

  classes.forEach((cls) => {
    if (cls.day !== today || !cls.notificationEnabled) return;
    const fireAt = notifyTimeForClass(cls);
    if (fireAt.getTime() <= now) return;

    reminders.push({
      id: `class-${cls.id}`,
      fireAt: fireAt.toISOString(),
      title: buildClassTitle(cls),
      body: buildClassBody(cls),
      url: `/manage/${cls.id}`,
      tag: `class-${cls.id}`,
    });
  });

  todos.forEach((todo) => {
    if (todo.date !== todayStr || todo.completed || !todo.reminderTime) return;
    const [h, m] = todo.reminderTime.split(':').map(Number);
    const fireAt = new Date();
    fireAt.setHours(h, m, 0, 0);
    if (fireAt.getTime() <= now) return;

    reminders.push({
      id: `todo-${todo.id}`,
      fireAt: fireAt.toISOString(),
      title: 'Task reminder',
      body: todo.text,
      url: `/todos?date=${todo.date}`,
      tag: `todo-${todo.id}`,
    });
  });

  return reminders.sort(
    (a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime()
  );
}
