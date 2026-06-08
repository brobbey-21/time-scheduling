'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClassForm, { type ClassFormData } from '@/components/ClassForm';
import { addClass, getClassesByDay } from '@/lib/db';
import { notifyScheduleRefresh } from '@/lib/notifications';
import { DAY_SHORT, type DayOfWeek } from '@/lib/types';
import { DAYS } from '@/lib/types';
import { formatTimeRange } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

function parseDayParam(value: string | null): DayOfWeek | null {
  if (!value) return null;
  return DAYS.includes(value as DayOfWeek) ? (value as DayOfWeek) : null;
}

function AddClassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayParam = parseDayParam(searchParams.get('day'));
  const [existingTimes, setExistingTimes] = useState<string[]>([]);

  useEffect(() => {
    if (!dayParam) return;
    getClassesByDay(dayParam).then((classes) => {
      setExistingTimes(
        classes.map((c) => formatTimeRange(c.startTime, c.endTime))
      );
    });
  }, [dayParam]);

  const handleSubmit = async (data: ClassFormData) => {
    const { meetingUrl, ...rest } = data;
    await addClass({
      id: uuidv4(),
      ...rest,
      meetingUrl: meetingUrl.trim() || undefined,
      isDefault: false,
    });
    notifyScheduleRefresh();
    router.push(dayParam ? `/timetable?day=${dayParam}` : '/manage');
  };

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href={dayParam ? `/timetable?day=${dayParam}` : '/manage'}
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-display mb-2">
        {dayParam ? `Add ${DAY_SHORT[dayParam]} Routine` : 'Add Personal Routine'}
      </h1>
      <p className="text-body mb-6 text-[var(--text-secondary)]">
        {dayParam
          ? `Repeats every ${dayParam}. Only you will see this — it won't affect other students.`
          : 'Private to your account. Study blocks, extra classes, or personal reminders.'}
      </p>
      <ClassForm
        initial={dayParam ? { day: dayParam } : undefined}
        onSubmit={handleSubmit}
        submitLabel={dayParam ? 'Add Routine' : 'Save Class'}
        dayHint={
          dayParam
            ? `This class will repeat every ${dayParam} only.`
            : undefined
        }
        existingTimes={existingTimes}
      />
    </main>
  );
}

export default function AddClassPage() {
  return (
    <Suspense fallback={<main className="px-5 pt-8"><div className="h-96 animate-pulse rounded-2xl bg-[var(--border)]" /></main>}>
      <AddClassContent />
    </Suspense>
  );
}
