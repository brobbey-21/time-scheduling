'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import ClassCard from '@/components/ClassCard';
import DaySelector from '@/components/DaySelector';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { getClassesByDay } from '@/lib/db';
import type { ClassEntry, DayOfWeek } from '@/lib/types';
import { DAYS } from '@/lib/types';
import {
  getDayNameFromDate,
  getTodayDayName,
  isWeekendDay,
} from '@/lib/utils';

function parseDayParam(value: string | null): DayOfWeek | null {
  if (!value) return null;
  return DAYS.includes(value as DayOfWeek) ? (value as DayOfWeek) : null;
}

function TimetableContent() {
  const searchParams = useSearchParams();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fromQuery = parseDayParam(searchParams.get('day'));
    setSelectedDay(fromQuery ?? getTodayDayName());
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDay) return;
    setLoaded(false);
    getClassesByDay(selectedDay).then((cls) => {
      setClasses(cls);
      setLoaded(true);
    });
  }, [selectedDay]);

  const isWeekend = selectedDay ? isWeekendDay(selectedDay) : false;
  const isToday = selectedDay === getDayNameFromDate(new Date());

  if (!selectedDay) {
    return (
      <main className="px-5 pt-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 pt-8">
      <PageHeader
        title="Timetable"
        subtitle={
          isToday
            ? isWeekend
              ? 'Showing your weekend schedule'
              : 'Showing today'
            : isWeekend
              ? `${selectedDay} · Weekend`
              : undefined
        }
        right={
          <div className="rounded-full bg-[var(--accent-light)] p-2.5">
            <Calendar size={20} className="text-accent" />
          </div>
        }
      />

      <div className="mb-5">
        <DaySelector selected={selectedDay} onChange={setSelectedDay} />
      </div>

      {!loaded ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          title={isWeekend ? 'No weekend classes' : 'No classes'}
          message={
            isWeekend
              ? `Nothing scheduled for ${selectedDay}. Your weekday timetable stays separate.`
              : `Nothing scheduled for ${selectedDay}.`
          }
        />
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} showTime />
          ))}
        </div>
      )}
    </main>
  );
}

function TimetableFallback() {
  return (
    <main className="px-5 pt-8">
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[var(--border)]" />
        ))}
      </div>
    </main>
  );
}

export default function TimetablePage() {
  return (
    <Suspense fallback={<TimetableFallback />}>
      <TimetableContent />
    </Suspense>
  );
}
