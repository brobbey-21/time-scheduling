'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble,
  CalendarRange,
  ChevronRight,
  Clock,
  Loader2,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { applyWeekPlan } from '@/lib/planner-apply';
import { PLANNER_VERSION } from '@/lib/study-profile';
import { isSleepAfterWake } from '@/lib/study-profile';
import {
  fetchStudyProfile,
  saveStudyPreferences,
} from '@/lib/study-profile-sync';
import {
  getPlanningDays,
  previewDayPlan,
} from '@/lib/study-planner';
import {
  ONBOARDING_COMPLETE_EVENT,
  OPEN_STUDY_SETUP_EVENT,
} from '@/lib/study-setup-events';
import { getSharedClasses } from '@/lib/schedule-utils';
import { getAllClasses } from '@/lib/db';
import type { StudyPreferences } from '@/lib/types';
import { DAY_SHORT } from '@/lib/types';

const STEP_ICONS = [Target, Clock, BedDouble, CalendarRange, Sparkles];

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function StudySetupWizard() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [prefs, setPrefs] = useState<StudyPreferences>({
    dailyBudgetMinutes: 360,
    wakeTime: '06:00',
    sleepTime: '23:00',
    planWeekends: false,
    breakMinutes: 15,
    minStudyBlockMinutes: 45,
    maxStudyBlockMinutes: 90,
    plannerVersion: PLANNER_VERSION,
  });
  const [preview, setPreview] = useState<
    { day: string; studyMinutes: number; blockCount: number }[]
  >([]);

  const isPublic = pathname === '/login' || pathname === '/offline';
  const totalSteps = 5;

  const tryOpen = useCallback(async (force = false) => {
    if (isPublic) return;
    const profile = await fetchStudyProfile();
    if (!force && profile.preferences.setupCompletedAt) return;
    setPrefs(profile.preferences);
    setStep(0);
    setOpen(true);
  }, [isPublic]);

  useEffect(() => {
    if (isPublic) return;

    const onOnboarding = () => void tryOpen();
    const onOpen = () => void tryOpen(true);

    window.addEventListener(ONBOARDING_COMPLETE_EVENT, onOnboarding);
    window.addEventListener(OPEN_STUDY_SETUP_EVENT, onOpen);

    return () => {
      window.removeEventListener(ONBOARDING_COMPLETE_EVENT, onOnboarding);
      window.removeEventListener(OPEN_STUDY_SETUP_EVENT, onOpen);
    };
  }, [isPublic, tryOpen]);

  useEffect(() => {
    if (step !== 4 || !open) return;
    void (async () => {
      const all = await getAllClasses();
      const shared = getSharedClasses(all);
      const days = getPlanningDays(prefs);
      const rows = days.map((day) => {
        const result = previewDayPlan(day, shared, prefs);
        return {
          day: DAY_SHORT[day],
          studyMinutes: result.studyMinutes,
          blockCount: result.blockCount,
        };
      });
      setPreview(rows);
    })();
  }, [step, open, prefs]);

  const validSleep = useMemo(
    () => isSleepAfterWake(prefs.wakeTime, prefs.sleepTime),
    [prefs.wakeTime, prefs.sleepTime]
  );

  const canAdvance = useMemo(() => {
    if (step === 2) return validSleep;
    return true;
  }, [step, validSleep]);

  const close = () => setOpen(false);

  const next = () => {
    if (!canAdvance) return;
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    void handleGenerate();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const now = Date.now();
      const finalPrefs: StudyPreferences = {
        ...prefs,
        setupCompletedAt: now,
        lastGeneratedAt: now,
        plannerVersion: PLANNER_VERSION,
      };
      await applyWeekPlan(finalPrefs);
      await saveStudyPreferences(finalPrefs, [{ type: 'setup_completed' }]);
      close();
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  const StepIcon = STEP_ICONS[step];
  const isLast = step === totalSteps - 1;

  const titles = [
    'Daily study goal',
    'When do you wake up?',
    'When do you sleep?',
    'Which days to plan?',
    'Your week preview',
  ];

  const bodies = [
    'How much focused study time do you want each day? We\'ll fit blocks around your official classes.',
    'We won\'t schedule study before this time.',
    'Study and rest blocks will end before bedtime.',
    'Include weekends or stick to class days only.',
    'Here\'s how your plan looks. You can edit any block later under My Routines.',
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[210] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="relative max-h-[90vh] w-full max-w-[390px] overflow-y-auto rounded-3xl bg-bg-card shadow-xl"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-base)]"
            aria-label="Close study setup"
          >
            <X size={18} />
          </button>

          <div
            className="px-6 pb-6 pt-10"
            style={{
              background:
                'linear-gradient(160deg, var(--accent-light) 0%, var(--bg-card) 55%)',
            }}
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-md">
              <StepIcon size={28} />
            </div>

            <p className="text-micro mb-2 font-semibold uppercase tracking-wider text-accent">
              Study Planner · Step {step + 1} of {totalSteps}
            </p>
            <h2 className="text-display text-[1.35rem] leading-tight">{titles[step]}</h2>
            <p className="text-body mt-3 text-[var(--text-secondary)]">{bodies[step]}</p>

            <div className="mt-5">
              {step === 0 && (
                <div>
                  <p className="text-title text-center text-accent">
                    {prefs.dailyBudgetMinutes / 60} hours / day
                  </p>
                  <input
                    type="range"
                    min={60}
                    max={600}
                    step={30}
                    value={prefs.dailyBudgetMinutes}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        dailyBudgetMinutes: parseInt(e.target.value, 10),
                      }))
                    }
                    className="mt-4 w-full accent-accent"
                  />
                  <div className="text-caption mt-2 flex justify-between text-[var(--text-tertiary)]">
                    <span>1h</span>
                    <span>10h</span>
                  </div>
                </div>
              )}

              {step === 1 && (
                <label className="block">
                  <span className="text-caption text-[var(--text-secondary)]">Wake time</span>
                  <input
                    type="time"
                    value={prefs.wakeTime}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, wakeTime: e.target.value }))
                    }
                    className="text-title mt-2 w-full rounded-xl border border-[var(--border)] bg-bg-base px-4 py-3"
                  />
                </label>
              )}

              {step === 2 && (
                <div>
                  <label className="block">
                    <span className="text-caption text-[var(--text-secondary)]">Sleep time</span>
                    <input
                      type="time"
                      value={prefs.sleepTime}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, sleepTime: e.target.value }))
                      }
                      className="text-title mt-2 w-full rounded-xl border border-[var(--border)] bg-bg-base px-4 py-3"
                    />
                  </label>
                  {!validSleep && (
                    <p className="text-caption mt-2 text-[var(--danger-text)]">
                      Sleep time must be after wake time.
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="flex gap-2">
                  {(
                    [
                      { value: false, label: 'Weekdays only', sub: 'Mon – Fri' },
                      { value: true, label: 'All 7 days', sub: 'Mon – Sun' },
                    ] as const
                  ).map(({ value, label, sub }) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() =>
                        setPrefs((p) => ({ ...p, planWeekends: value }))
                      }
                      className={`flex-1 rounded-xl border px-3 py-4 text-left transition-colors ${
                        prefs.planWeekends === value
                          ? 'border-accent bg-[var(--accent-light)]'
                          : 'border-[var(--border)] bg-bg-base'
                      }`}
                    >
                      <p className="text-body font-semibold">{label}</p>
                      <p className="text-caption mt-1 text-[var(--text-secondary)]">{sub}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-2 rounded-xl bg-bg-base p-3">
                  {preview.length === 0 ? (
                    <p className="text-caption text-[var(--text-secondary)]">
                      Loading preview…
                    </p>
                  ) : (
                    preview.map((row) => (
                      <div
                        key={row.day}
                        className="flex items-center justify-between text-caption"
                      >
                        <span className="font-medium">{row.day}</span>
                        <span className="text-[var(--text-secondary)]">
                          {formatHours(row.studyMinutes)} study · {row.blockCount} blocks
                        </span>
                      </div>
                    ))
                  )}
                  <p className="text-caption border-t border-[var(--border)] pt-2 text-[var(--text-tertiary)]">
                    Rest breaks are added automatically between study blocks.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-accent' : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              disabled={!canAdvance || generating}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-body font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {generating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isLast ? (
                'Generate my plan'
              ) : (
                <>
                  Next
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={close}
              className="mt-3 w-full py-2 text-caption font-medium text-[var(--text-tertiary)]"
            >
              Set up later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
