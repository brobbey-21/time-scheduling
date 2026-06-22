'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ClassCardCompact from '@/components/ClassCardCompact';
import EmptyState from '@/components/EmptyState';
import type { ReactNode } from 'react';

interface TodaySectionProps {
  title: string;
  href?: string;
  linkLabel?: string;
  badge?: number;
  children: ReactNode;
}

export function TodaySection({
  title,
  href,
  linkLabel = 'See all',
  badge,
  children,
}: TodaySectionProps) {
  return (
    <section className="mb-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-body font-semibold">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro font-semibold text-accent">
              {badge}
            </span>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-micro font-medium text-accent"
          >
            {linkLabel} <ChevronRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

import type { ClassEntry } from '@/lib/types';

interface TodaySchedulePreviewProps {
  classes: ClassEntry[];
  emptyTitle: string;
  emptyMessage: string;
  timetableHref: string;
  totalCount: number;
}

export function TodaySchedulePreview({
  classes,
  emptyTitle,
  emptyMessage,
  timetableHref,
  totalCount,
}: TodaySchedulePreviewProps) {
  if (classes.length === 0) {
    return (
      <EmptyState title={emptyTitle} message={emptyMessage} />
    );
  }

  return (
    <div className="space-y-2">
      {classes.map((cls) => (
        <ClassCardCompact key={cls.id} cls={cls} />
      ))}
      {totalCount > classes.length && (
        <Link
          href={timetableHref}
          className="block rounded-xl border border-dashed border-[var(--border)] py-2.5 text-center text-caption font-medium text-accent"
        >
          +{totalCount - classes.length} more on timetable
        </Link>
      )}
    </div>
  );
}
