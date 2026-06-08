'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClassForm, { type ClassFormData } from '@/components/ClassForm';
import { fetchSharedSchedule, saveSharedSchedule } from '@/lib/admin-schedule';
import { DAY_SHORT, type DayOfWeek } from '@/lib/types';
import { DAYS } from '@/lib/types';
import { formatTimeRange } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

function parseDayParam(value: string | null): DayOfWeek | null {
  if (!value) return null;
  return DAYS.includes(value as DayOfWeek) ? (value as DayOfWeek) : null;
}

function AdminAddContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayParam = parseDayParam(searchParams.get('day'));
  const [existingTimes, setExistingTimes] = useState<string[]>([]);

  useEffect(() => {
    fetchSharedSchedule().then((classes) => {
      const day = dayParam ?? 'Monday';
      setExistingTimes(
        classes
          .filter((c) => c.day === day)
          .map((c) => formatTimeRange(c.startTime, c.endTime))
      );
    });
  }, [dayParam]);

  const handleSubmit = async (data: ClassFormData) => {
    const { meetingUrl, ...rest } = data;
    const shared = await fetchSharedSchedule();
    const now = Date.now();
    const entry = {
      id: uuidv4(),
      ...rest,
      meetingUrl: meetingUrl.trim() || undefined,
      isDefault: true as const,
      createdAt: now,
      updatedAt: now,
    };
    await saveSharedSchedule([...shared, entry]);
    router.push('/admin/schedule');
  };

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href="/admin/schedule"
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-display mb-2">Add Official Class</h1>
      <p className="text-body mb-6 text-[var(--text-secondary)]">
        This will appear on every MN 3C student&apos;s timetable.
      </p>
      <ClassForm
        initial={dayParam ? { day: dayParam } : undefined}
        onSubmit={handleSubmit}
        submitLabel="Add to Schedule"
        existingTimes={existingTimes}
      />
    </main>
  );
}

export default function AdminAddPage() {
  return (
    <Suspense fallback={<main className="px-5 pt-8"><div className="h-96 animate-pulse rounded-2xl bg-[var(--border)]" /></main>}>
      <AdminAddContent />
    </Suspense>
  );
}
