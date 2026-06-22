'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { getAllClasses } from '@/lib/db';
import { buildDayPlaybook } from '@/lib/study-agenda';
import { fetchStudyProfile } from '@/lib/study-profile-sync';
import { getSharedClasses } from '@/lib/schedule-utils';
import type { DailyPlaybook, DayOfWeek } from '@/lib/types';
import { DAY_SHORT, DAYS } from '@/lib/types';
import { getDayNameFromDate } from '@/lib/utils';

function nextDayName(day: DayOfWeek): DayOfWeek {
  const i = DAYS.indexOf(day);
  return DAYS[(i + 1) % 7];
}

export default function DailyStudyGuide() {
  const [todayPlaybook, setTodayPlaybook] = useState<DailyPlaybook | null>(null);
  const [tomorrowPlaybook, setTomorrowPlaybook] = useState<DailyPlaybook | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const today = getDayNameFromDate(new Date());
      const tomorrow = nextDayName(today);
      const profile = await fetchStudyProfile();
      const prefs = profile.preferences;

      if (!prefs.setupCompletedAt) {
        setLoaded(true);
        return;
      }

      const aiToday = profile.lastAiOptimization?.dailyPlaybooks?.find(
        (p) => p.day === today
      );
      const aiTomorrow = profile.lastAiOptimization?.dailyPlaybooks?.find(
        (p) => p.day === tomorrow
      );

      if (aiToday && aiTomorrow) {
        setTodayPlaybook(aiToday);
        setTomorrowPlaybook(aiTomorrow);
        setLoaded(true);
        return;
      }

      const shared = getSharedClasses(await getAllClasses());
      setTodayPlaybook(buildDayPlaybook(today, shared, prefs));
      setTomorrowPlaybook(buildDayPlaybook(tomorrow, shared, prefs));
      setLoaded(true);
    })();
  }, []);

  if (!loaded || !todayPlaybook) return null;

  const studyIntents = todayPlaybook.intents.filter((i) => !i.eveningOnly);
  const eveningIntents = todayPlaybook.intents.filter((i) => i.eveningOnly);

  return (
    <section className="card mb-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-light)]">
          <Sparkles size={20} className="text-accent" />
        </div>
        <div>
          <p className="text-body font-semibold">Today&apos;s study plan</p>
          <p className="text-caption mt-1 text-[var(--text-secondary)]">
            {todayPlaybook.headline}
          </p>
        </div>
      </div>

      {studyIntents.length > 0 && (
        <div className="space-y-2">
          <p className="text-micro uppercase text-[var(--text-tertiary)]">Before classes</p>
          {studyIntents.map((intent, i) => (
            <div key={`${intent.courseCode}-${i}`} className="rounded-lg bg-[var(--bg-base)] px-3 py-2">
              <p className="text-caption font-medium">
                {intent.courseCode}
                {intent.creditHours === 3 && (
                  <span className="ml-2 rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro text-accent">
                    High CWA
                  </span>
                )}
                <span className="text-[var(--text-tertiary)]"> · {intent.minutes} min</span>
              </p>
              <p className="text-caption mt-0.5 text-[var(--text-secondary)]">{intent.activity}</p>
            </div>
          ))}
        </div>
      )}

      {eveningIntents.length > 0 && (
        <div className="space-y-2">
          <p className="text-micro uppercase text-[var(--text-tertiary)]">Tonight — prep tomorrow</p>
          {eveningIntents.map((intent, i) => (
            <div key={`eve-${intent.courseCode}-${i}`} className="rounded-lg bg-[var(--bg-base)] px-3 py-2">
              <p className="text-caption font-medium">
                {intent.courseCode} · {intent.minutes} min
              </p>
              <p className="text-caption mt-0.5 text-[var(--text-secondary)]">{intent.activity}</p>
            </div>
          ))}
        </div>
      )}

      {tomorrowPlaybook && (
        <div className="flex gap-2 rounded-xl border border-[var(--border)] p-3">
          <CalendarClock size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-caption font-medium">Tomorrow ({DAY_SHORT[tomorrowPlaybook.day]})</p>
            <p className="text-caption mt-0.5 text-[var(--text-secondary)]">
              {tomorrowPlaybook.tomorrowPreview}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
