'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import ClassCardCompact from '@/components/ClassCardCompact';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { deleteClasses, getAllClasses } from '@/lib/db';
import type { ClassEntry } from '@/lib/types';
import { DAYS } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'schedule' | 'routines';
type RoutineFilter = 'all' | 'planned' | 'manual';

interface SessionUser {
  name: string;
  role: 'admin' | 'student';
}

export default function ManagePage() {
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [tab, setTab] = useState<Tab>('schedule');
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<SessionUser | null>(null);
  const [routineFilter, setRoutineFilter] = useState<RoutineFilter>('all');

  const load = () => getAllClasses().then(setClasses);

  useEffect(() => {
    load();
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null));

    const refresh = () => load();
    window.addEventListener('classes-changed', refresh);
    return () => window.removeEventListener('classes-changed', refresh);
  }, []);

  const scheduleClasses = classes
    .filter((c) => c.isDefault)
    .sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

  const routineClasses = classes
    .filter((c) => !c.isDefault)
    .sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

  const routineFiltered =
    routineFilter === 'planned'
      ? routineClasses.filter((c) => c.plannerGenerated)
      : routineFilter === 'manual'
        ? routineClasses.filter((c) => !c.plannerGenerated)
        : routineClasses;

  const filtered = tab === 'schedule' ? scheduleClasses : routineFiltered;
  const canEdit = tab === 'routines';

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    await deleteClasses(Array.from(selected));
    setSelected(new Set());
    setEditMode(false);
    load();
  };

  return (
    <main className="px-5 pt-8 pb-8">
      <PageHeader
        title="Classes"
        subtitle="Shared MN 3C schedule + your private routines"
        right={
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              aria-label="Settings"
            >
              <Settings size={20} />
            </Link>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditMode(!editMode);
                  setSelected(new Set());
                }}
                className={cn(
                  'text-caption font-semibold',
                  editMode ? 'text-accent' : 'text-[var(--text-secondary)]'
                )}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        {(
          [
            { id: 'schedule' as Tab, label: 'MN 3C Schedule' },
            { id: 'routines' as Tab, label: 'My Routines' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setEditMode(false);
              setSelected(new Set());
            }}
            className={cn(
              'rounded-full px-4 py-2 text-caption font-medium',
              tab === id
                ? 'bg-accent text-white'
                : 'border border-[var(--border)] bg-bg-card text-[var(--text-secondary)]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <p className="text-caption mb-4 text-[var(--text-secondary)]">
          Same for everyone in MN 3C.
          {user?.role === 'admin' ? (
            <>
              {' '}
              <Link href="/admin/schedule" className="font-medium text-accent">
                Edit as admin →
              </Link>
            </>
          ) : (
            ' Managed by your class admin.'
          )}
        </p>
      )}

      {tab === 'routines' && (
        <>
          <p className="text-caption mb-3 text-[var(--text-secondary)]">
            Private to your account — study blocks, extra classes, or personal reminders.
          </p>
          <div className="mb-4 flex gap-2">
            {(
              [
                { id: 'all' as RoutineFilter, label: 'All' },
                { id: 'planned' as RoutineFilter, label: 'Planned' },
                { id: 'manual' as RoutineFilter, label: 'Manual' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRoutineFilter(id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-micro font-medium',
                  routineFilter === id
                    ? 'bg-[var(--accent-light)] text-accent'
                    : 'text-[var(--text-tertiary)]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {editMode && selected.size > 0 && (
        <button
          type="button"
          onClick={handleBulkDelete}
          className="mb-4 w-full rounded-xl bg-red-50 py-2.5 text-caption font-semibold text-red-600"
        >
          Delete {selected.size} selected
        </button>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'schedule' ? 'No shared classes' : 'No routines yet'}
          message={
            tab === 'schedule'
              ? 'The admin has not published the class schedule yet.'
              : 'Add a personal routine with the + button. Only you will see it.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((cls) => (
            <ClassCardCompact
              key={cls.id}
              cls={cls}
              selectable={editMode && canEdit}
              selected={selected.has(cls.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {tab === 'routines' && (
        <Link
          href="/manage/add"
          className="fixed bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform active:scale-95"
          style={{ right: 'max(20px, calc((100vw - 430px) / 2 + 20px))' }}
          aria-label="Add personal routine"
        >
          <Plus size={24} />
        </Link>
      )}
    </main>
  );
}
