'use client';

import { useState } from 'react';
import { Loader2, MapPin, Sparkles, Wand2 } from 'lucide-react';
import { applyWeekPlan } from '@/lib/planner-apply';
import { fetchPlannerOptimization } from '@/lib/planner-ai-client';
import { toGenerationOptions } from '@/lib/planner-optimize';
import { saveStudyPreferences } from '@/lib/study-profile-sync';
import type { PlannerAiOptimization, StudyPreferences } from '@/lib/types';
import { DAY_SHORT, DAYS } from '@/lib/types';

interface PlannerAiOptimizeCardProps {
  studyPrefs: StudyPreferences;
  lastOptimization?: PlannerAiOptimization;
  onApplied: (prefs: StudyPreferences, optimization: PlannerAiOptimization) => void;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function PlannerAiOptimizeCard({
  studyPrefs,
  lastOptimization,
  onApplied,
}: PlannerAiOptimizeCardProps) {
  const [optimization, setOptimization] = useState<PlannerAiOptimization | null>(
    lastOptimization ?? null
  );
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [aiWarning, setAiWarning] = useState('');

  const handleOptimize = async () => {
    setError('');
    setAiWarning('');
    setOptimizing(true);
    try {
      const result = await fetchPlannerOptimization();
      if (result?.optimization) {
        setOptimization(result.optimization);
        if (result.aiWarning) setAiWarning(result.aiWarning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not optimize plan');
    } finally {
      setOptimizing(false);
    }
  };

  const handleApply = async () => {
    if (!optimization) return;
    setError('');
    setApplying(true);
    try {
      const mergedPrefs: StudyPreferences = {
        ...studyPrefs,
        ...optimization.preferences,
      };
      const profile = await saveStudyPreferences(mergedPrefs);
      if (!profile) throw new Error('Could not save preferences');

      await applyWeekPlan(mergedPrefs, toGenerationOptions(optimization));
      onApplied(mergedPrefs, optimization);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply optimization');
    } finally {
      setApplying(false);
    }
  };

  const playbooks = optimization?.dailyPlaybooks ?? [];
  const dailyEntries = DAYS.filter(
    (day) => optimization?.dailyStudyMinutes[day] !== undefined
  );

  return (
    <div className="space-y-3 rounded-xl border border-accent/20 bg-[var(--accent-light)]/40 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-light)]">
          <Sparkles size={20} className="text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-body font-semibold">AI learning route</p>
          <p className="text-caption mt-1 text-[var(--text-secondary)]">
            ~6h/day, max 2h per course, evening blocks prep tomorrow. 3-credit courses
            prioritized for CWA.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOptimize}
        disabled={optimizing || applying}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white disabled:opacity-60"
      >
        {optimizing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Wand2 size={18} />
        )}
        {optimizing ? 'Building learning route…' : 'Optimize with AI'}
      </button>

      {error && <p className="text-caption text-[var(--danger-text)]">{error}</p>}
      {aiWarning && !error && (
        <p className="text-caption text-[var(--text-secondary)]">{aiWarning}</p>
      )}

      {optimization && (
        <div className="space-y-3 rounded-xl bg-bg-card p-3">
          <p className="text-body">{optimization.summary}</p>

          {playbooks.length > 0 && (
            <div className="space-y-3">
              <p className="text-micro flex items-center gap-1 uppercase text-[var(--text-tertiary)]">
                <MapPin size={12} />
                Daily playbooks
              </p>
              {playbooks.map((pb) => (
                <div
                  key={pb.day}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-3"
                >
                  <p className="text-caption font-semibold">{DAY_SHORT[pb.day]}</p>
                  <p className="text-caption mt-1 text-[var(--text-secondary)]">{pb.headline}</p>
                  <p className="text-micro mt-2 text-[var(--text-tertiary)]">
                    {pb.tomorrowPreview}
                  </p>
                  {pb.intents.length > 0 && (
                    <ul className="text-caption mt-2 space-y-1 text-[var(--text-secondary)]">
                      {pb.intents.slice(0, 4).map((intent, i) => (
                        <li key={`${intent.courseCode}-${i}`}>
                          {intent.eveningOnly ? 'Tonight' : 'Today'}: {intent.courseCode} (
                          {intent.minutes}m) — {intent.activity}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {optimization.learningRoute?.length > 0 && (
            <div>
              <p className="text-micro mb-2 uppercase text-[var(--text-tertiary)]">
                Next learning steps
              </p>
              <div className="space-y-2">
                {optimization.learningRoute.slice(0, 5).map((step, index) => (
                  <div
                    key={`${step.courseCode}-${step.day}-${index}`}
                    className="rounded-lg bg-[var(--bg-base)] px-3 py-2"
                  >
                    <p className="text-caption font-medium">
                      {index + 1}. {step.courseCode}{' '}
                      <span className="text-[var(--text-tertiary)]">
                        · {step.creditHours} cr
                        {step.creditHours === 3 ? ' · CWA' : ''}
                      </span>
                    </p>
                    <p className="text-caption mt-0.5 text-[var(--text-secondary)]">
                      {step.suggestedFocus}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {optimization.courseFocus.length > 0 && (
            <div>
              <p className="text-micro mb-2 uppercase text-[var(--text-tertiary)]">
                Course priority
              </p>
              <div className="flex flex-wrap gap-2">
                {optimization.courseFocus.slice(0, 6).map((focus) => (
                  <span
                    key={focus.courseCode}
                    className="rounded-full bg-[var(--bg-base)] px-2.5 py-1 text-micro font-medium"
                  >
                    {focus.courseCode} ({focus.creditHours ?? '?'}cr)
                  </span>
                ))}
              </div>
            </div>
          )}

          {dailyEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {dailyEntries.map((day) => (
                <div
                  key={day}
                  className="rounded-lg bg-[var(--bg-base)] px-3 py-2 text-caption"
                >
                  <span className="text-[var(--text-secondary)]">{DAY_SHORT[day]}</span>
                  <span className="float-right font-medium">
                    {formatMinutes(optimization.dailyStudyMinutes[day] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleApply}
            disabled={applying || optimizing}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold shadow-sm disabled:opacity-60"
          >
            {applying ? (
              <Loader2 size={18} className="animate-spin text-accent" />
            ) : (
              <Sparkles size={18} className="text-accent" />
            )}
            {applying ? 'Applying…' : 'Apply learning route & regenerate'}
          </button>
        </div>
      )}
    </div>
  );
}
