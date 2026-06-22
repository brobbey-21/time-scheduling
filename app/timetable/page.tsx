'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import ClassCard from '@/components/ClassCard';
import DaySelector from '@/components/DaySelector';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { applyDayPlan } from '@/lib/planner-apply';
import { getClassesByDay } from '@/lib/db';
import { fetchStudyProfile } from '@/lib/study-profile-sync';
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
  const [regenerating, setRegenerating] = useState(false);
  const [hasPlanner, setHasPlanner] = useState(false);

  useEffect(() => {
    const fromQuery = parseDayParam(searchParams.get('day'));
    setSelectedDay(fromQuery ?? getTodayDayName());
  }, [searchParams]);

  useEffect(() => {
    fetchStudyProfile().then((profile) => {
      setHasPlanner(Boolean(profile.preferences.setupCompletedAt));
    });
  }, []);

  useEffect(() => {
    if (!selectedDay) return;
    const loadDay = () => {
      setLoaded(false);
      getClassesByDay(selectedDay).then((cls) => {
        setClasses(cls);
        setLoaded(true);
      });
    };
    loadDay();
    window.addEventListener('classes-changed', loadDay);
    return () => window.removeEventListener('classes-changed', loadDay);
  }, [selectedDay]);

  const handleRegenerateDay = async () => {
    if (!selectedDay) return;
    const profile = await fetchStudyProfile();
    if (!profile.preferences.setupCompletedAt) {
      alert('Set up Study Planner in Settings first.');
      return;
    }
    if (
      !confirm(
        `Regenerate planned study blocks for ${selectedDay}? Manual routines are kept.`
      )
    ) {
      return;
    }
    setRegenerating(true);
    try {
      await applyDayPlan(selectedDay, profile.preferences);
    } finally {
      setRegenerating(false);
    }
  };

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

      {hasPlanner && (
        <button
          type="button"
          onClick={handleRegenerateDay}
          disabled={regenerating}
          className="text-caption mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/30 bg-[var(--accent-light)] py-2.5 font-semibold text-accent disabled:opacity-60"
        >
          <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating…' : `Regenerate ${selectedDay} study plan`}
        </button>
      )}

      {!loaded ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div>
          <EmptyState
            title={isWeekend ? 'No weekend classes' : 'No classes'}
            message={
              isWeekend
                ? `Nothing scheduled for ${selectedDay}. Add a routine if you have weekend classes.`
                : `Nothing scheduled for ${selectedDay}. Add a weekly routine for this day.`
            }
          />
          <Link
            href={`/manage/add?day=${selectedDay}`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-body font-semibold text-white"
          >
            <Plus size={18} />
            Add {selectedDay} Routine
          </Link>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} showTime />
          ))}
        </div>
      )}

      <Link
        href={`/manage/add?day=${selectedDay}`}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform active:scale-95"
        style={{ marginRight: 'max(0px, calc((100vw - 430px) / 2))' }}
        aria-label={`Add personal routine for ${selectedDay}`}
      >
        <Plus size={24} />
      </Link>
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
