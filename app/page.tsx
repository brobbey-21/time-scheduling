'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Plus, Sun } from 'lucide-react';
import DailyStudyGuide from '@/components/DailyStudyGuide';
import BottomSheet from '@/components/BottomSheet';
import EmptyState from '@/components/EmptyState';
import IOSBanner from '@/components/IOSBanner';
import NextUpCard from '@/components/NextUpCard';
import { TodaySchedulePreview, TodaySection } from '@/components/TodaySections';
import TodoItem from '@/components/TodoItem';
import { addTodo, deleteTodo, getClassesByDay, getSetting, getTodosByDate, updateTodo } from '@/lib/db';
import {
  getNotificationPermission,
  notifyScheduleRefresh,
  requestNotificationPermission,
} from '@/lib/notifications';
import type { ClassEntry, DayOfWeek, TodoEntry } from '@/lib/types';
import {
  formatDateLong,
  getDayNameFromDate,
  getGreeting,
  isClassActive,
  isClassUpcoming,
  isWeekendDay,
  timeToMinutes,
  toDateString,
} from '@/lib/utils';

const SCHEDULE_PREVIEW = 2;
const TASK_PREVIEW = 2;

function isClassPast(endTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(endTime) < nowMins;
}

export default function TodayPage() {
  const [viewDate, setViewDate] = useState<Date | null>(null);
  const [todayDay, setTodayDay] = useState<DayOfWeek | null>(null);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [todos, setTodos] = useState<TodoEntry[]>([]);
  const [userName, setUserName] = useState('there');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newTodo, setNewTodo] = useState('');
  const [taskRemind, setTaskRemind] = useState(true);
  const [taskReminderTime, setTaskReminderTime] = useState('');
  const [defaultTaskReminder, setDefaultTaskReminder] = useState('18:00');
  const [loaded, setLoaded] = useState(false);

  const isWeekend = todayDay ? isWeekendDay(todayDay) : false;
  const dateStr = viewDate ? toDateString(viewDate) : '';

  const load = useCallback(async (day: DayOfWeek, date: string) => {
    const [cls, tds] = await Promise.all([
      getClassesByDay(day),
      getTodosByDate(date),
    ]);
    setClasses(cls);
    setTodos(tds);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const now = new Date();
    const day = getDayNameFromDate(now);
    const date = toDateString(now);
    setViewDate(now);
    setTodayDay(day);
    load(day, date);
    getSetting('defaultTaskReminderTime', '18:00').then(setDefaultTaskReminder);

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setUserName(data.user.name.split(' ')[0]);
        }
      });
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (todayDay && dateStr) load(todayDay, dateStr);
    };
    window.addEventListener('todos-changed', refresh);
    window.addEventListener('classes-changed', refresh);
    return () => {
      window.removeEventListener('todos-changed', refresh);
      window.removeEventListener('classes-changed', refresh);
    };
  }, [load, todayDay, dateStr]);

  const nextUp = classes.find((c) => isClassUpcoming(c.startTime) || isClassActive(c.startTime, c.endTime));
  const pendingTodos = todos.filter((t) => !t.completed);
  const topTodos = pendingTodos.slice(0, TASK_PREVIEW);

  const remainingClasses = classes.filter(
    (c) => !isClassPast(c.endTime) && c.id !== nextUp?.id
  );
  const schedulePreview = remainingClasses.slice(0, SCHEDULE_PREVIEW);

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && todayDay) {
      await updateTodo(id, { completed: !todo.completed });
      load(todayDay, dateStr);
      notifyScheduleRefresh();
    }
  };

  const handleStarTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && todayDay) {
      await updateTodo(id, { starred: !todo.starred });
      load(todayDay, dateStr);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
    if (todayDay) load(todayDay, dateStr);
    notifyScheduleRefresh();
  };

  const handleSetReminder = async (id: string, reminderTime: string | undefined) => {
    await updateTodo(id, { reminderTime });
    if (todayDay) load(todayDay, dateStr);
    notifyScheduleRefresh();
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !todayDay) return;
    await addTodo({
      date: dateStr,
      text: newTodo.trim(),
      completed: false,
      starred: false,
      reminderTime: taskRemind
        ? taskReminderTime || defaultTaskReminder
        : undefined,
    });
    setNewTodo('');
    setTaskReminderTime('');
    setSheetOpen(false);
    notifyScheduleRefresh();
    load(todayDay, dateStr);
  };

  const handleBellClick = async () => {
    const perm = getNotificationPermission();
    if (perm === 'default') {
      await requestNotificationPermission();
    }
    notifyScheduleRefresh();
  };

  const scheduleSummary =
    classes.length === 0
      ? isWeekend
        ? 'No weekend classes scheduled'
        : 'No classes today'
      : isWeekend
        ? `${classes.length} weekend class${classes.length === 1 ? '' : 'es'} today`
        : `${classes.length} class${classes.length === 1 ? '' : 'es'} today`;

  const timetableHref = todayDay
    ? `/timetable?day=${encodeURIComponent(todayDay)}`
    : '/timetable';

  if (!loaded || !viewDate || !todayDay) {
    return (
      <main className="px-5 pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-[var(--border)]" />
          <div className="h-32 rounded-2xl bg-[var(--border)]" />
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 pt-6 pb-8">
      <IOSBanner />

      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-micro uppercase tracking-wide text-[var(--text-tertiary)]">
              {formatDateLong(viewDate)}
            </p>
            <h1 className="text-display mt-0.5 leading-tight">
              {getGreeting()}, {userName}
            </h1>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--bg-base)] px-2.5 py-1 text-micro font-medium text-[var(--text-secondary)]">
                {scheduleSummary}
              </span>
              {pendingTodos.length > 0 && (
                <span className="rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-micro font-medium text-accent">
                  {pendingTodos.length} task{pendingTodos.length === 1 ? '' : 's'}
                </span>
              )}
              {isWeekend && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-micro font-semibold text-amber-700">
                  <Sun size={11} />
                  Weekend
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBellClick}
            className="shrink-0 rounded-full bg-bg-card p-2.5 shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-accent" />
          </button>
        </div>
      </header>

      {nextUp && (
        <section className="mb-5">
          <NextUpCard cls={nextUp} />
        </section>
      )}

      <DailyStudyGuide />

      <TodaySection title="Up next" href={timetableHref} badge={classes.length}>
        <TodaySchedulePreview
          classes={schedulePreview}
          totalCount={remainingClasses.length}
          timetableHref={timetableHref}
          emptyTitle={isWeekend ? 'Weekend is clear' : 'No classes left today'}
          emptyMessage={
            isWeekend
              ? `Nothing left on ${todayDay}. Enjoy the break.`
              : classes.length === 0
                ? 'Enjoy your free day!'
                : 'All done for today — nice work.'
          }
        />
      </TodaySection>

      <TodaySection
        title="Tasks"
        href={`/todos?date=${dateStr}`}
        badge={pendingTodos.length}
      >
        {topTodos.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            message="Tap + to add a quick task for today."
          />
        ) : (
          <div className="space-y-2">
            {topTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onStar={handleStarTodo}
                onDelete={handleDeleteTodo}
                onSetReminder={handleSetReminder}
              />
            ))}
            {pendingTodos.length > TASK_PREVIEW && (
              <Link
                href={`/todos?date=${dateStr}`}
                className="block rounded-xl border border-dashed border-[var(--border)] py-2.5 text-center text-caption font-medium text-accent"
              >
                +{pendingTodos.length - TASK_PREVIEW} more tasks
              </Link>
            )}
          </div>
        )}
      </TodaySection>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform active:scale-95"
        style={{ right: 'max(20px, calc((100vw - 430px) / 2 + 20px))' }}
        aria-label="Add task"
      >
        <Plus size={24} />
      </button>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Quick Add Task"
      >
        <input
          autoFocus
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="What needs to be done?"
          className="mb-4 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
        />
        <label className="mb-3 flex items-center justify-between">
          <span className="text-caption text-[var(--text-secondary)]">Remind me</span>
          <button
            type="button"
            role="switch"
            aria-checked={taskRemind}
            onClick={() => setTaskRemind((v) => !v)}
            className={`relative h-6 w-10 rounded-full transition-colors ${
              taskRemind ? 'bg-accent' : 'bg-[var(--border)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                taskRemind ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        </label>
        {taskRemind && (
          <input
            type="time"
            value={taskReminderTime || defaultTaskReminder}
            onChange={(e) => setTaskReminderTime(e.target.value)}
            className="mb-4 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-body outline-none"
          />
        )}
        <button
          type="button"
          onClick={handleAddTodo}
          className="w-full rounded-xl bg-accent py-3 text-body font-semibold text-white"
        >
          Add Task
        </button>
      </BottomSheet>
    </main>
  );
}
