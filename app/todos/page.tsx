'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import TodoItem from '@/components/TodoItem';
import {
  addTodo,
  deleteTodo,
  getTodosByDate,
  updateTodo,
} from '@/lib/db';
import { notifyScheduleRefresh } from '@/lib/notifications';
import type { TodoEntry } from '@/lib/types';
import {
  cn,
  formatDateShort,
  getDayNameFromDate,
  isWeekendDay,
  parseDateString,
  toDateString,
} from '@/lib/utils';

type Filter = 'all' | 'pending' | 'completed';

function TodosContent() {
  const searchParams = useSearchParams();
  const [date, setDate] = useState<Date | null>(null);
  const [todos, setTodos] = useState<TodoEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [newText, setNewText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [reminderTime, setReminderTime] = useState('');

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setDate(parseDateString(dateParam));
    } else {
      setDate(new Date());
    }
  }, [searchParams]);

  const dateStr = date ? toDateString(date) : '';

  const load = () => {
    if (!dateStr) return;
    getTodosByDate(dateStr).then(setTodos);
  };

  useEffect(() => {
    load();
  }, [dateStr]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener('todos-changed', refresh);
    return () => window.removeEventListener('todos-changed', refresh);
  }, [dateStr]);

  if (!date) {
    return (
      <main className="px-5 pt-8 pb-8">
        <div className="animate-pulse h-24 rounded-2xl bg-[var(--border)]" />
      </main>
    );
  }

  const dayName = getDayNameFromDate(date);
  const isWeekend = isWeekendDay(dayName);

  const filtered = todos.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.order - b.order;
  });

  const shiftDate = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    setDate(next);
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addTodo({
      date: dateStr,
      text: newText.trim(),
      completed: false,
      starred: false,
      reminderTime: reminderTime || undefined,
    });
    setNewText('');
    setReminderTime('');
    setShowInput(false);
    load();
    notifyScheduleRefresh();
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <main className="px-5 pt-8 pb-8">
      <PageHeader
        title="Todos"
        subtitle={isWeekend ? `${dayName} · Weekend` : undefined}
      />

      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftDate(-1)} className="p-1">
            <ChevronLeft size={20} className="text-[var(--text-secondary)]" />
          </button>
          <span className="text-subtitle">{formatDateShort(date)}</span>
          <button type="button" onClick={() => shiftDate(1)} className="p-1">
            <ChevronRight size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDate(new Date())}
          className="rounded-full bg-[var(--accent-light)] p-2"
        >
          <Calendar size={18} className="text-accent" />
        </button>
      </div>

      <div className="mb-5 flex gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-4 py-2 text-caption font-medium',
              filter === key
                ? 'bg-accent text-white'
                : 'border border-[var(--border)] bg-bg-card text-[var(--text-secondary)]'
            )}
          >
            {label}{filter === key ? ' •' : ''}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="No tasks"
          message={
            isWeekend
              ? `Nothing planned for this ${dayName}.`
              : 'Add a task to get started.'
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={async (id) => {
                const t = todos.find((x) => x.id === id);
                if (t) {
                  await updateTodo(id, { completed: !t.completed });
                  load();
                }
              }}
              onStar={async (id) => {
                const t = todos.find((x) => x.id === id);
                if (t) {
                  await updateTodo(id, { starred: !t.starred });
                  load();
                }
              }}
              onDelete={async (id) => {
                await deleteTodo(id);
                load();
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        {showInput ? (
          <div className="card space-y-3">
            <input
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add a new task..."
              className="w-full bg-transparent text-body outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="text-caption text-[var(--text-secondary)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="flex-1 rounded-xl border border-[var(--border)] py-2 text-caption"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 rounded-xl bg-accent py-2 text-caption font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="card flex w-full items-center justify-between text-[var(--text-tertiary)]"
          >
            <span className="text-body">Add a new task...</span>
            <Plus size={20} className="text-accent" />
          </button>
        )}
      </div>
    </main>
  );
}

export default function TodosPage() {
  return (
    <Suspense
      fallback={
        <main className="px-5 pt-8 pb-8">
          <div className="animate-pulse h-24 rounded-2xl bg-[var(--border)]" />
        </main>
      }
    >
      <TodosContent />
    </Suspense>
  );
}
