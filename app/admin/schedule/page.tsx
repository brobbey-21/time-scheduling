'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Shield } from 'lucide-react';
import ClassCardCompact from '@/components/ClassCardCompact';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import IcsImportButton from '@/components/IcsImportButton';
import { fetchSharedSchedule } from '@/lib/admin-schedule';
import type { ClassEntry } from '@/lib/types';
import { DAYS } from '@/lib/types';

export default function AdminSchedulePage() {
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    fetchSharedSchedule()
      .then(setClasses)
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = [...classes].sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <main className="px-5 pt-8 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-caption font-medium text-accent"
        >
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link
          href="/admin/users"
          className="text-caption font-medium text-accent"
        >
          Members
        </Link>
      </div>

      <PageHeader
        title="Class Schedule"
        subtitle="Official MN 3C timetable — updates for everyone"
        right={
          <div className="rounded-full bg-[var(--accent-light)] p-2.5">
            <Shield size={20} className="text-accent" />
          </div>
        }
      />

      <div className="mb-5 space-y-4">
        <div className="rounded-xl bg-[var(--accent-light)] p-4">
          <p className="text-caption text-[var(--text-secondary)]">
            Changes here update the shared schedule for all MN 3C students. When importing
            .ics, choose <strong>Public</strong> for everyone or <strong>Private</strong> for
            only your account. Personal study routines are not affected by public imports.
          </p>
        </div>
        <IcsImportButton
          onImported={load}
          defaultVisibility="public"
          allowPublic
          showVisibilityChoice
        />
      </div>

      {!loaded ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No classes yet"
          message="Add the official MN 3C class schedule."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((cls) => (
            <ClassCardCompact
              key={cls.id}
              cls={cls}
              href={`/admin/schedule/${cls.id}/edit`}
              badge="Official"
            />
          ))}
        </div>
      )}

      <Link
        href="/admin/schedule/add"
        className="fixed bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform active:scale-95"
        style={{ right: 'max(20px, calc((100vw - 430px) / 2 + 20px))' }}
        aria-label="Add class to schedule"
      >
        <Plus size={24} />
      </Link>
    </main>
  );
}
