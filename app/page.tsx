'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, Plus, Sun } from 'lucide-react';
import BottomSheet from '@/components/BottomSheet';
import ClassCard from '@/components/ClassCard';
import EmptyState from '@/components/EmptyState';
import IOSBanner from '@/components/IOSBanner';
import NextUpCard from '@/components/NextUpCard';
import TodoItem from '@/components/TodoItem';
import { addTodo, getClassesByDay, getTodosByDate } from '@/lib/db';
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
  isClassUpcoming,
  isWeekendDay,
  toDateString,
} from '@/lib/utils';

export default function TodayPage() {
  const [viewDate, setViewDate] = useState<Date | null>(null);
  const [todayDay, setTodayDay] = useState<DayOfWeek | null>(null);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [todos, setTodos] = useState<TodoEntry[]>([]);
  const [userName, setUserName] = useState('there');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newTodo, setNewTodo] = useState('');
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

  const nextUp = classes.find((c) => isClassUpcoming(c.startTime));
  const pendingTodos = todos.filter((t) => !t.completed);
  const topTodos = pendingTodos.slice(0, 3);

  const handleToggleTodo = async (id: string) => {
    const { updateTodo } = await import('@/lib/db');
    const todo = todos.find((t) => t.id === id);
    if (todo && todayDay) {
      await updateTodo(id, { completed: !todo.completed });
      load(todayDay, dateStr);
    }
  };

  const handleStarTodo = async (id: string) => {
    const { updateTodo } = await import('@/lib/db');
    const todo = todos.find((t) => t.id === id);
    if (todo && todayDay) {
      await updateTodo(id, { starred: !todo.starred });
      load(todayDay, dateStr);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    const { deleteTodo } = await import('@/lib/db');
    await deleteTodo(id);
    if (todayDay) load(todayDay, dateStr);
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !todayDay) return;
    await addTodo({
      date: dateStr,
      text: newTodo.trim(),
      completed: false,
      starred: false,
    });
    setNewTodo('');
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
    <main className="px-5 pt-8">
      <IOSBanner />

      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-caption text-[var(--text-secondary)]">
              {getGreeting()},
            </p>
            <h1 className="text-display">{userName}</h1>
            <p className="text-caption mt-1 text-[var(--text-secondary)]">
              {formatDateLong(viewDate)}
            </p>
            {isWeekend && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-micro font-semibold uppercase tracking-wide text-amber-700">
                <Sun size={12} />
                Weekend
              </span>
            )}
            <p className="text-caption mt-2 font-medium text-accent">
              {scheduleSummary} • {pendingTodos.length} task
              {pendingTodos.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBellClick}
            className="rounded-full bg-bg-card p-2.5 shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-accent" />
          </button>
        </div>
      </header>

      {nextUp && (
        <section className="mb-6">
          <NextUpCard cls={nextUp} />
        </section>
      )}

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-subtitle">
            {isWeekend ? `${todayDay}'s Schedule` : "Today's Schedule"}
          </h2>
          <Link
            href={timetableHref}
            className="flex items-center gap-0.5 text-caption font-medium text-accent"
          >
            See all <ChevronRight size={14} />
          </Link>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            icon={Sun}
            title={isWeekend ? 'Weekend is clear' : 'No classes today'}
            message={
              isWeekend
                ? `Nothing on your ${todayDay} timetable. Add a class or enjoy the break.`
                : 'Enjoy your free day!'
            }
          />
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-subtitle">
              {isWeekend ? `${todayDay}'s Tasks` : "Today's Tasks"}
            </h2>
            {pendingTodos.length > 0 && (
              <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro font-semibold text-accent">
                {pendingTodos.length}
              </span>
            )}
          </div>
          <Link
            href={`/todos?date=${dateStr}`}
            className="flex items-center gap-0.5 text-caption font-medium text-accent"
          >
            See all <ChevronRight size={14} />
          </Link>
        </div>
        {topTodos.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            message={
              isWeekend
                ? 'Add something you want to get done this weekend.'
                : 'Tap + to add a quick task.'
            }
          />
        ) : (
          <div className="space-y-3">
            {topTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onStar={handleStarTodo}
                onDelete={handleDeleteTodo}
              />
            ))}
          </div>
        )}
      </section>

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
