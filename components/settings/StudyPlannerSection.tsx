'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Trash2, RefreshCw } from 'lucide-react';
import Toggle from '@/components/Toggle';
import PlannerAiOptimizeCard from '@/components/PlannerAiOptimizeCard';
import { applyWeekPlan, clearPlannerBlocksFromTimetable } from '@/lib/planner-apply';
import {
  isValidWakeSleep,
  formatSleepScheduleLabel,
} from '@/lib/study-profile';
import {
  dispatchOpenStudySetup,
} from '@/lib/study-setup-events';
import {
  clearStudyPlannerProfile,
  fetchStudyProfile,
  saveStudyPreferences,
} from '@/lib/study-profile-sync';
import { notifyScheduleRefresh } from '@/lib/notifications';
import type { PlannerAiOptimization, StudyPreferences } from '@/lib/types';

export default function StudyPlannerSection() {
  const [studyPrefs, setStudyPrefs] = useState<StudyPreferences | null>(null);
  const [lastAiOptimization, setLastAiOptimization] = useState<
    PlannerAiOptimization | undefined
  >(undefined);
  const [savingStudyPrefs, setSavingStudyPrefs] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [clearingPlanner, setClearingPlanner] = useState(false);

  useEffect(() => {
    fetchStudyProfile().then((p) => {
      setStudyPrefs(p.preferences);
      setLastAiOptimization(p.lastAiOptimization);
    });
  }, []);

  const handleSaveStudyPrefs = async () => {
    if (!studyPrefs || !isValidWakeSleep(studyPrefs.wakeTime, studyPrefs.sleepTime)) return;
    setSavingStudyPrefs(true);
    const profile = await saveStudyPreferences(studyPrefs);
    if (profile) setStudyPrefs(profile.preferences);
    setSavingStudyPrefs(false);
  };

  const handleRegenerateWeek = async () => {
    if (!studyPrefs?.setupCompletedAt) {
      dispatchOpenStudySetup();
      return;
    }
    setRegeneratingPlan(true);
    try {
      await applyWeekPlan(studyPrefs);
      const profile = await fetchStudyProfile();
      setStudyPrefs(profile.preferences);
    } finally {
      setRegeneratingPlan(false);
    }
  };

  const handleClearPlanner = async () => {
    setClearingPlanner(true);
    try {
      await clearPlannerBlocksFromTimetable();
      const profile = await clearStudyPlannerProfile();
      if (profile) {
        setStudyPrefs(profile.preferences);
        setLastAiOptimization(undefined);
      }
      notifyScheduleRefresh();
    } finally {
      setClearingPlanner(false);
    }
  };

  const onAiApplied = (prefs: StudyPreferences, optimization: PlannerAiOptimization) => {
    setStudyPrefs(prefs);
    setLastAiOptimization(optimization);
    notifyScheduleRefresh();
  };

  return (
    <section className="mb-6">
      <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Study Planner</p>
      <div className="card space-y-4">
        <p className="text-caption text-[var(--text-secondary)]">
          Auto-build study and rest blocks around your official class schedule.
        </p>

        {studyPrefs?.setupCompletedAt && (
          <PlannerAiOptimizeCard
            studyPrefs={studyPrefs}
            lastOptimization={lastAiOptimization}
            onApplied={onAiApplied}
          />
        )}

        {studyPrefs ? (
          <>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-body">Daily study goal</span>
                <span className="text-caption font-medium text-accent">
                  {studyPrefs.dailyBudgetMinutes / 60}h
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={600}
                step={30}
                value={studyPrefs.dailyBudgetMinutes}
                onChange={(e) =>
                  setStudyPrefs((p) =>
                    p
                      ? { ...p, dailyBudgetMinutes: parseInt(e.target.value, 10) }
                      : p
                  )
                }
                className="mt-2 w-full accent-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-caption text-[var(--text-secondary)]">Wake</span>
                <input
                  type="time"
                  value={studyPrefs.wakeTime}
                  onChange={(e) =>
                    setStudyPrefs((p) =>
                      p ? { ...p, wakeTime: e.target.value } : p
                    )
                  }
                  className="text-caption mt-1 w-full rounded-lg border border-[var(--border)] bg-bg-base px-2 py-2"
                />
              </label>
              <label>
                <span className="text-caption text-[var(--text-secondary)]">Sleep</span>
                <input
                  type="time"
                  value={studyPrefs.sleepTime}
                  onChange={(e) =>
                    setStudyPrefs((p) =>
                      p ? { ...p, sleepTime: e.target.value } : p
                    )
                  }
                  className="text-caption mt-1 w-full rounded-lg border border-[var(--border)] bg-bg-base px-2 py-2"
                />
              </label>
            </div>

            {isValidWakeSleep(studyPrefs.wakeTime, studyPrefs.sleepTime) && (
              <p className="text-caption text-[var(--text-secondary)]">
                {formatSleepScheduleLabel(studyPrefs.wakeTime, studyPrefs.sleepTime)}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-body">Include weekends</span>
              <Toggle
                enabled={studyPrefs.planWeekends}
                onChange={() =>
                  setStudyPrefs((p) =>
                    p ? { ...p, planWeekends: !p.planWeekends } : p
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <div>
                <p className="text-body">Max per course / day</p>
                <p className="text-caption text-[var(--text-secondary)]">
                  Cap study time on one course (default 2h)
                </p>
              </div>
              <select
                value={studyPrefs.maxCourseMinutesPerDay ?? 120}
                onChange={(e) =>
                  setStudyPrefs((p) =>
                    p
                      ? {
                          ...p,
                          maxCourseMinutesPerDay: parseInt(e.target.value, 10),
                        }
                      : p
                  )
                }
                className="text-caption rounded-lg border border-[var(--border)] bg-bg-base px-2 py-1"
              >
                {[60, 90, 120, 150].map((m) => (
                  <option key={m} value={m}>
                    {m / 60}h
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-body">Evening = tomorrow prep</p>
                <p className="text-caption text-[var(--text-secondary)]">
                  After 5pm, study for next day&apos;s classes
                </p>
              </div>
              <Toggle
                enabled={studyPrefs.eveningPrepNextDay ?? true}
                onChange={() =>
                  setStudyPrefs((p) =>
                    p
                      ? { ...p, eveningPrepNextDay: !p.eveningPrepNextDay }
                      : p
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">Prioritize 3-credit courses</span>
              <Toggle
                enabled={studyPrefs.prioritizeHighCredit ?? true}
                onChange={() =>
                  setStudyPrefs((p) =>
                    p
                      ? { ...p, prioritizeHighCredit: !p.prioritizeHighCredit }
                      : p
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={handleSaveStudyPrefs}
              disabled={
                savingStudyPrefs ||
                !isValidWakeSleep(studyPrefs.wakeTime, studyPrefs.sleepTime)
              }
              className="w-full rounded-xl border border-[var(--border)] py-2.5 text-caption font-semibold disabled:opacity-60"
            >
              {savingStudyPrefs ? 'Saving…' : 'Save preferences'}
            </button>
          </>
        ) : (
          <p className="text-caption text-[var(--text-tertiary)]">Loading…</p>
        )}

        <button
          type="button"
          onClick={() => dispatchOpenStudySetup()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-light)] py-3 text-body font-semibold text-accent"
        >
          <Sparkles size={18} />
          {studyPrefs?.setupCompletedAt ? 'Re-run setup wizard' : 'Set up Study Planner'}
        </button>

        {studyPrefs?.setupCompletedAt && (
          <button
            type="button"
            onClick={handleRegenerateWeek}
            disabled={regeneratingPlan}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw size={18} className={regeneratingPlan ? 'animate-spin' : ''} />
            {regeneratingPlan ? 'Regenerating…' : 'Regenerate full week'}
          </button>
        )}

        {(studyPrefs?.setupCompletedAt || lastAiOptimization) && (
          <button
            type="button"
            onClick={handleClearPlanner}
            disabled={clearingPlanner}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold text-[var(--danger-text)] disabled:opacity-60"
          >
            <Trash2 size={18} />
            {clearingPlanner ? 'Clearing…' : 'Clear AI & Smart Planner'}
          </button>
        )}
      </div>
    </section>
  );
}
