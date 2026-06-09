import type { ClassEntry, DayOfWeek, TodoEntry } from './types';
import { DAYS } from './types';
import {
  formatDurationBetween,
  formatTime12,
  getDayNameFromDate,
  parseDateString,
  timeToMinutes,
  toDateString,
} from './utils';

export const SCHEDULE_LOOKAHEAD_DAYS = 7;

export interface ReminderSlot {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  url: string;
  tag: string;
  requireInteraction?: boolean;
}

export interface ReminderScheduleOptions {
  endOfDayEnabled?: boolean;
  endOfDayTime?: string;
}

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

function classNotifyAt(cls: ClassEntry, onDate: Date): Date {
  const [h, m] = cls.startTime.split(':').map(Number);
  const at = new Date(onDate);
  at.setHours(h, m - cls.notificationMinsBefore, 0, 0);
  return at;
}

function datesForWeekday(day: DayOfWeek, from: Date, days: number): Date[] {
  const out: Date[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (getDayNameFromDate(d) === day) out.push(d);
  }
  return out;
}

export function buildClassReminders(
  classes: ClassEntry[],
  from: Date = new Date()
): ReminderSlot[] {
  const now = from.getTime();
  const slots: ReminderSlot[] = [];

  classes.forEach((cls) => {
    if (!cls.notificationEnabled) return;

    const dates = datesForWeekday(cls.day, from, SCHEDULE_LOOKAHEAD_DAYS);

    for (const date of dates) {
      const dateStr = toDateString(date);

      if (cls.type === 'REST') {
        const [eh, em] = cls.endTime.split(':').map(Number);
        const fireAt = new Date(date);
        fireAt.setHours(eh, em, 0, 0);
        if (fireAt.getTime() <= now) continue;

        const duration = formatDurationBetween(cls.startTime, cls.endTime);
        slots.push({
          id: `rest-end-${cls.id}-${dateStr}`,
          fireAt,
          title: `Break over — ${duration} rest done`,
          body: `${cls.courseName || 'Rest'} finished at ${formatTime12(cls.endTime)}. Time for your next block.`,
          url: `/timetable?day=${encodeURIComponent(cls.day)}`,
          tag: `rest-end-${cls.id}-${dateStr}`,
          requireInteraction: true,
        });
        continue;
      }

      const meetingUrl =
        cls.type === 'CLASS_VLE' && cls.meetingUrl ? cls.meetingUrl : undefined;
      const fireAt = classNotifyAt(cls, date);
      if (fireAt.getTime() <= now) continue;

      slots.push({
        id: `class-${cls.id}-${dateStr}`,
        fireAt,
        title: buildClassTitle(cls),
        body: buildClassBody(cls),
        url: meetingUrl ?? `/manage/${cls.id}`,
        tag: `class-${cls.id}-${dateStr}`,
        requireInteraction: cls.type === 'CLASS_VLE' || cls.type === 'CLASS_PHYSICAL',
      });
    }
  });

  return slots;
}

export function buildTodoReminders(
  todos: TodoEntry[],
  from: Date = new Date()
): ReminderSlot[] {
  const now = from.getTime();
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + SCHEDULE_LOOKAHEAD_DAYS);

  const slots: ReminderSlot[] = [];

  todos.forEach((todo) => {
    if (todo.completed || !todo.reminderTime) return;

    const todoDate = parseDateString(todo.date);
    if (todoDate < start || todoDate >= end) return;

    const [h, m] = todo.reminderTime.split(':').map(Number);
    const fireAt = new Date(todoDate);
    fireAt.setHours(h, m, 0, 0);
    if (fireAt.getTime() <= now) return;

    slots.push({
      id: `todo-${todo.id}`,
      fireAt,
      title: 'Task reminder',
      body: todo.text,
      url: `/todos?date=${todo.date}`,
      tag: `todo-${todo.id}`,
    });
  });

  return slots;
}

export function buildEndOfDayReminders(
  todos: TodoEntry[],
  options: ReminderScheduleOptions,
  from: Date = new Date()
): ReminderSlot[] {
  if (!options.endOfDayEnabled || !options.endOfDayTime) return [];

  const [h, m] = options.endOfDayTime.split(':').map(Number);
  const now = from.getTime();
  const slots: ReminderSlot[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < SCHEDULE_LOOKAHEAD_DAYS; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dateStr = toDateString(day);

    const pending = todos.filter((t) => t.date === dateStr && !t.completed);
    if (pending.length === 0) continue;

    const fireAt = new Date(day);
    fireAt.setHours(h, m, 0, 0);
    if (fireAt.getTime() <= now) continue;

    const preview = pending
      .slice(0, 3)
      .map((t) => t.text)
      .join(' · ');
    const extra = pending.length > 3 ? ` (+${pending.length - 3} more)` : '';

    slots.push({
      id: `eod-${dateStr}`,
      fireAt,
      title: `Day ending — ${pending.length} task${pending.length === 1 ? '' : 's'} left`,
      body: `${preview}${extra}`,
      url: `/todos?date=${dateStr}`,
      tag: `eod-${dateStr}`,
      requireInteraction: true,
    });
  }

  return slots;
}

export function buildAllReminders(
  classes: ClassEntry[],
  todos: TodoEntry[],
  options: ReminderScheduleOptions = {},
  from: Date = new Date()
): ReminderSlot[] {
  return [
    ...buildClassReminders(classes, from),
    ...buildTodoReminders(todos, from),
    ...buildEndOfDayReminders(todos, options, from),
  ].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

export function getUpcomingClassReminderCount(
  classes: ClassEntry[],
  from: Date = new Date()
): number {
  const nowMins = from.getHours() * 60 + from.getMinutes();
  const today = getDayNameFromDate(from);

  return classes.filter((cls) => {
    if (cls.day !== today || !cls.notificationEnabled) return false;
    const notifyMins = timeToMinutes(cls.startTime) - cls.notificationMinsBefore;
    return notifyMins > nowMins;
  }).length;
}

/** Next calendar date (within lookahead) for a weekday. */
export function nextDateForDay(day: DayOfWeek, from: Date = new Date()): Date | null {
  const dates = datesForWeekday(day, from, SCHEDULE_LOOKAHEAD_DAYS);
  return dates[0] ?? null;
}

export { DAYS };
