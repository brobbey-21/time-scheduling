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

type Tab = 'all' | 'custom';

export default function ManagePage() {
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => getAllClasses().then(setClasses);

  useEffect(() => {
    load();
  }, []);

  const filtered =
    tab === 'custom'
      ? classes.filter((c) => !c.isDefault)
      : classes.sort((a, b) => {
          const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.startTime.localeCompare(b.startTime);
        });

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
        title="Manage Classes"
        right={
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              aria-label="Settings"
            >
              <Settings size={20} />
            </Link>
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
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        {(['all', 'custom'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-4 py-2 text-caption font-medium',
              tab === t
                ? 'bg-accent text-white'
                : 'border border-[var(--border)] bg-bg-card text-[var(--text-secondary)]'
            )}
          >
            {t === 'all' ? 'All Classes' : 'Custom Classes'}
            {tab === t ? ' •' : ''}
          </button>
        ))}
      </div>

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
          title="No classes"
          message={
            tab === 'custom'
              ? 'Add a custom class with the + button.'
              : 'Your timetable will appear here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((cls) => (
            <ClassCardCompact
              key={cls.id}
              cls={cls}
              selectable={editMode}
              selected={selected.has(cls.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      <Link
        href="/manage/add"
        className="fixed bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform active:scale-95"
        style={{ right: 'max(20px, calc((100vw - 430px) / 2 + 20px))' }}
        aria-label="Add class"
      >
        <Plus size={24} />
      </Link>
    </main>
  );
}
