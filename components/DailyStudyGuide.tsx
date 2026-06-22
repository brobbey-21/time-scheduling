'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Moon, Sparkles, Sun } from 'lucide-react';
import { getAllClasses } from '@/lib/db';
import { buildDayPlaybook } from '@/lib/study-agenda';
import { fetchStudyProfile } from '@/lib/study-profile-sync';
import { getSharedClasses } from '@/lib/schedule-utils';
import type { DailyPlaybook, DayOfWeek, StudyIntent } from '@/lib/types';
import { DAY_SHORT, DAYS } from '@/lib/types';
import { getDayNameFromDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

function nextDayName(day: DayOfWeek): DayOfWeek {
  const i = DAYS.indexOf(day);
  return DAYS[(i + 1) % 7];
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function StudyIntentRow({
  intent,
  variant,
}: {
  intent: StudyIntent;
  variant: 'day' | 'evening';
}) {
  const isHighCwa = intent.creditHours === 3;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border px-3.5 py-3',
        variant === 'evening'
          ? 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-[var(--bg-base)]'
          : 'border-[var(--border)] bg-gradient-to-br from-[var(--accent-light)]/35 to-[var(--bg-base)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold leading-snug text-[var(--text-primary)]">
            {intent.courseName}
          </p>
          <p className="text-micro mt-0.5 font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            {intent.courseCode}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-micro font-semibold',
            variant === 'evening'
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-white/80 text-[var(--text-secondary)] shadow-sm'
          )}
        >
          {formatMinutes(intent.minutes)}
        </span>
      </div>

      <p className="text-caption mt-2.5 leading-relaxed text-[var(--text-secondary)]">
        {intent.activity}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {isHighCwa && (
          <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro font-semibold text-accent">
            High CWA
          </span>
        )}
        <span className="text-micro text-[var(--text-tertiary)]">Prep for {intent.prepFor}</span>
      </div>
    </div>
  );
}

export default function DailyStudyGuide() {
  const [todayPlaybook, setTodayPlaybook] = useState<DailyPlaybook | null>(null);
  const [tomorrowDay, setTomorrowDay] = useState<DayOfWeek | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const today = getDayNameFromDate(new Date());
      const tomorrow = nextDayName(today);
      setTomorrowDay(tomorrow);

      const profile = await fetchStudyProfile();
      const prefs = profile.preferences;

      if (!prefs.setupCompletedAt) {
        setLoaded(true);
        return;
      }

      const aiToday = profile.lastAiOptimization?.dailyPlaybooks?.find(
        (p) => p.day === today
      );

      if (aiToday) {
        setTodayPlaybook(aiToday);
        setLoaded(true);
        return;
      }

      const shared = getSharedClasses(await getAllClasses());
      setTodayPlaybook(buildDayPlaybook(today, shared, prefs));
      setLoaded(true);
    })();
  }, []);

  if (!loaded || !todayPlaybook) return null;

  const studyIntents = todayPlaybook.intents.filter((i) => !i.eveningOnly);
  const eveningIntents = todayPlaybook.intents.filter((i) => i.eveningOnly);
  const totalMinutes = todayPlaybook.intents.reduce((sum, i) => sum + i.minutes, 0);
  const budget = 360;
  const progress = Math.min(100, Math.round((totalMinutes / budget) * 100));

  return (
    <section className="card mb-6 overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent-light)]/60 to-transparent px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
            <Sparkles size={22} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-subtitle font-semibold">Today&apos;s study plan</p>
            <p className="text-caption mt-1 leading-relaxed text-[var(--text-secondary)]">
              {todayPlaybook.headline}
            </p>
          </div>
        </div>

        {totalMinutes > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-micro">
              <span className="text-[var(--text-tertiary)]">Study budget</span>
              <span className="font-semibold text-[var(--text-secondary)]">
                {formatMinutes(totalMinutes)} planned
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 px-4 py-4">
        {studyIntents.length > 0 && (
          <div className="space-y-2.5">
            <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              <Sun size={12} className="text-amber-500" />
              Before classes
            </p>
            {studyIntents.map((intent, i) => (
              <StudyIntentRow key={`${intent.courseCode}-${i}`} intent={intent} variant="day" />
            ))}
          </div>
        )}

        {eveningIntents.length > 0 && (
          <div className="space-y-2.5">
            <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              <Moon size={12} className="text-indigo-500" />
              Tonight — prep tomorrow
            </p>
            {eveningIntents.map((intent, i) => (
              <StudyIntentRow
                key={`eve-${intent.courseCode}-${i}`}
                intent={intent}
                variant="evening"
              />
            ))}
          </div>
        )}

        {tomorrowDay && todayPlaybook.tomorrowPreview && (
          <div className="flex gap-3 rounded-xl border border-accent/25 bg-[var(--accent-light)]/25 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
              <CalendarClock size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-caption font-semibold">
                Tomorrow · {DAY_SHORT[tomorrowDay]}
              </p>
              <p className="text-caption mt-1 leading-relaxed text-[var(--text-secondary)]">
                {todayPlaybook.tomorrowPreview}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
