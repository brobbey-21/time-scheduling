'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
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
  compact = false,
}: {
  intent: StudyIntent;
  variant: 'day' | 'evening';
  compact?: boolean;
}) {
  const isHighCwa = intent.creditHours === 3;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 py-2">
        <div className="min-w-0">
          <p className="text-caption truncate font-medium">{intent.courseName}</p>
          <p className="text-micro truncate text-[var(--text-tertiary)]">
            {intent.courseCode}
            {isHighCwa ? ' · High CWA' : ''}
          </p>
        </div>
        <span className="shrink-0 text-micro font-semibold text-[var(--text-secondary)]">
          {formatMinutes(intent.minutes)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5',
        variant === 'evening'
          ? 'border-indigo-200/60 bg-indigo-50/40'
          : 'border-[var(--border)] bg-[var(--bg-base)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold leading-snug">{intent.courseName}</p>
          <p className="text-micro text-[var(--text-tertiary)]">{intent.courseCode}</p>
        </div>
        <span className="shrink-0 text-micro font-semibold text-[var(--text-secondary)]">
          {formatMinutes(intent.minutes)}
        </span>
      </div>
      {!compact && (
        <p className="text-micro mt-1.5 line-clamp-2 text-[var(--text-secondary)]">
          {intent.activity}
        </p>
      )}
    </div>
  );
}

export default function DailyStudyGuide() {
  const [todayPlaybook, setTodayPlaybook] = useState<DailyPlaybook | null>(null);
  const [tomorrowDay, setTomorrowDay] = useState<DayOfWeek | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
  const intentCount = todayPlaybook.intents.length;

  if (intentCount === 0) return null;

  const previewDay = studyIntents.slice(0, 2);
  const previewEvening = eveningIntents.slice(0, 1);

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
        aria-expanded={expanded}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-light)]">
          <Sparkles size={18} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-body font-semibold">Study plan</p>
            <span className="shrink-0 rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-micro font-semibold text-[var(--text-secondary)]">
              {formatMinutes(totalMinutes)}
            </span>
          </div>
          <p className="text-caption mt-0.5 line-clamp-2 text-[var(--text-secondary)]">
            {todayPlaybook.headline}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--text-tertiary)]" />
        )}
      </button>

      {!expanded && tomorrowDay && todayPlaybook.tomorrowPreview && (
        <div className="border-t border-[var(--border)] px-4 py-2.5">
          <p className="text-micro flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <CalendarClock size={12} className="text-accent" />
            Tomorrow ({DAY_SHORT[tomorrowDay]}) · {todayPlaybook.tomorrowPreview}
          </p>
        </div>
      )}

      {expanded && (
        <div className="space-y-4 border-t border-[var(--border)] px-4 py-3">
          {studyIntents.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                <Sun size={12} className="text-amber-500" />
                Before classes
              </p>
              <div className="space-y-2">
                {(studyIntents.length > 3 ? previewDay : studyIntents).map((intent, i) => (
                  <StudyIntentRow key={`${intent.courseCode}-${i}`} intent={intent} variant="day" />
                ))}
                {studyIntents.length > 3 && (
                  <p className="text-micro text-[var(--text-tertiary)]">
                    +{studyIntents.length - 2} more — see Timetable
                  </p>
                )}
              </div>
            </div>
          )}

          {eveningIntents.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                <Moon size={12} className="text-indigo-500" />
                Tonight
              </p>
              <div className="space-y-2">
                {(eveningIntents.length > 3 ? previewEvening : eveningIntents).map(
                  (intent, i) => (
                    <StudyIntentRow
                      key={`eve-${intent.courseCode}-${i}`}
                      intent={intent}
                      variant="evening"
                    />
                  )
                )}
                {eveningIntents.length > 3 && (
                  <p className="text-micro text-[var(--text-tertiary)]">
                    +{eveningIntents.length - 1} more — see Timetable
                  </p>
                )}
              </div>
            </div>
          )}

          {tomorrowDay && todayPlaybook.tomorrowPreview && (
            <p className="text-caption rounded-lg bg-[var(--accent-light)]/40 px-3 py-2 text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">
                Tomorrow ({DAY_SHORT[tomorrowDay]})
              </span>
              {' · '}
              {todayPlaybook.tomorrowPreview}
            </p>
          )}

          <Link
            href="/timetable"
            className="block text-center text-caption font-medium text-accent"
          >
            Open full timetable
          </Link>
        </div>
      )}
    </section>
  );
}
