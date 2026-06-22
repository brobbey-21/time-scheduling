import {
  creditHoursToWeight,
  getCourseCredits,
  normalizeCourseCode,
  summarizeCourseCatalog,
} from './course-catalog';
import {
  learningRouteToCourseWeights,
  predictLearningRoute,
} from './learning-route';
import {
  mergePlaybookIntentsWithFallback,
  playbooksToGenerationOptions,
  validateDailyPlaybooks,
} from './planner-validate';
import { buildWeekPlaybooks } from './study-agenda';
import type {
  ClassEntry,
  DailyPlaybook,
  DayOfWeek,
  LearningRouteStep,
  PlannerAiOptimization,
  PlannerCourseFocus,
  PlannerGenerationOptions,
  StudyPreferences,
  StudyProfile,
} from './types';
import { DAYS } from './types';
import { generatePlannerJson, friendlyAiError, isPlannerLlmConfigured } from './planner-llm';
import { getPlanningDays } from './study-planner';

interface RawAiResponse {
  summary?: string;
  tips?: string[];
  preferences?: Partial<StudyPreferences>;
  dailyStudyMinutes?: Partial<Record<DayOfWeek, number>>;
  courseFocus?: PlannerCourseFocus[];
  learningRoute?: LearningRouteStep[];
  dailyPlaybooks?: DailyPlaybook[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function normalizePreferences(
  raw: Partial<StudyPreferences> | undefined,
  base: StudyPreferences
): Partial<StudyPreferences> {
  if (!raw) return {};

  const next: Partial<StudyPreferences> = {};

  if (typeof raw.dailyBudgetMinutes === 'number') {
    next.dailyBudgetMinutes = clamp(Math.round(raw.dailyBudgetMinutes), 60, 600);
  }
  if (typeof raw.breakMinutes === 'number') {
    next.breakMinutes = clamp(Math.round(raw.breakMinutes), 5, 30);
  }
  if (typeof raw.minStudyBlockMinutes === 'number') {
    next.minStudyBlockMinutes = clamp(Math.round(raw.minStudyBlockMinutes), 25, 75);
  }
  if (typeof raw.maxStudyBlockMinutes === 'number') {
    next.maxStudyBlockMinutes = clamp(Math.round(raw.maxStudyBlockMinutes), 45, 120);
  }
  if (typeof raw.maxCourseMinutesPerDay === 'number') {
    next.maxCourseMinutesPerDay = clamp(Math.round(raw.maxCourseMinutesPerDay), 60, 180);
  }
  if (typeof raw.planWeekends === 'boolean') next.planWeekends = raw.planWeekends;
  if (typeof raw.eveningPrepNextDay === 'boolean') {
    next.eveningPrepNextDay = raw.eveningPrepNextDay;
  }
  if (typeof raw.prioritizeHighCredit === 'boolean') {
    next.prioritizeHighCredit = raw.prioritizeHighCredit;
  }
  if (raw.wakeTime) next.wakeTime = normalizeTime(raw.wakeTime, base.wakeTime);
  if (raw.sleepTime) next.sleepTime = normalizeTime(raw.sleepTime, base.sleepTime);

  if (
    next.minStudyBlockMinutes &&
    next.maxStudyBlockMinutes &&
    next.minStudyBlockMinutes > next.maxStudyBlockMinutes
  ) {
    next.maxStudyBlockMinutes = next.minStudyBlockMinutes;
  }

  return next;
}

function normalizeDailyBudgets(
  raw: Partial<Record<DayOfWeek, number>> | undefined,
  prefs: StudyPreferences
): Partial<Record<DayOfWeek, number>> {
  const days = getPlanningDays(prefs);
  const result: Partial<Record<DayOfWeek, number>> = {};

  for (const day of days) {
    const value = raw?.[day];
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[day] = clamp(Math.round(value), 0, 480);
    }
  }

  return result;
}

function normalizeCourseFocus(
  raw: PlannerCourseFocus[] | undefined,
  sharedClasses: ClassEntry[],
  routeWeights: Record<string, number>
): PlannerCourseFocus[] {
  const knownCodes = new Set(
    sharedClasses
      .filter((c) => c.isDefault && c.courseCode)
      .map((c) => normalizeCourseCode(c.courseCode))
  );

  const merged = new Map<string, PlannerCourseFocus>();

  for (const code of Array.from(knownCodes)) {
    if (code === 'REST' || code === 'STUDY') continue;
    const credits = getCourseCredits(code);
    const basePriority = Math.max(
      creditHoursToWeight(credits),
      routeWeights[code] ?? 0
    );
    merged.set(code, {
      courseCode: code,
      creditHours: credits,
      priority: clamp(Math.round(basePriority), 1, 10),
      reason:
        credits === 3
          ? '3-credit course — high CWA impact; take seriously.'
          : `${credits}-credit course — prep before class.`,
    });
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item?.courseCode) continue;
      const code = normalizeCourseCode(item.courseCode);
      if (!knownCodes.has(code)) continue;
      const credits = getCourseCredits(code);
      const existing = merged.get(code);
      merged.set(code, {
        courseCode: code,
        creditHours: credits,
        priority: clamp(
          Math.round(Math.max(existing?.priority ?? 0, item.priority ?? 0)),
          1,
          10
        ),
        reason: String(item.reason ?? existing?.reason ?? '').slice(0, 200),
      });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.priority - a.priority || a.courseCode.localeCompare(b.courseCode))
    .slice(0, 12);
}

function summarizeClasses(sharedClasses: ClassEntry[]): string {
  const teaching = sharedClasses
    .filter((c) => c.isDefault)
    .sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

  if (teaching.length === 0) return 'No official classes on file.';

  return teaching
    .map((c) => {
      const credits = getCourseCredits(c.courseCode);
      return `${c.day} ${c.startTime}-${c.endTime} ${c.courseCode} (${credits} cr) ${c.courseName} [${c.type}]`;
    })
    .join('\n');
}

function summarizeFeedback(profile: StudyProfile): string {
  const recent = profile.feedback.slice(-12);
  if (recent.length === 0) return 'No planner edits yet.';

  return recent
    .map((event) => {
      const when = new Date(event.at).toISOString().slice(0, 10);
      const day = event.day ? ` ${event.day}` : '';
      const details = event.details ? ` — ${event.details}` : '';
      return `${when} ${event.type}${day}${details}`;
    })
    .join('\n');
}

function buildPrompt(
  prefs: StudyPreferences,
  profile: StudyProfile,
  sharedClasses: ClassEntry[],
  baselinePlaybooks: DailyPlaybook[],
  baselineRoute: ReturnType<typeof predictLearningRoute>
): string {
  const planningDays = getPlanningDays(prefs);

  return `You are a study planning coach for MN 3C engineering students at UMaT.

Build a strategic weekly learning route. Students study ~6 hours/day, max 2 hours per course per day, max 2 hours per session.
Evening study (after 17:00) must prep TOMORROW's classes. Do NOT repeat one course all day — rotate courses.

Return ONLY valid JSON:
{
  "summary": "2-3 sentences",
  "tips": ["specific actionable tip"],
  "preferences": { "dailyBudgetMinutes": 360, "maxStudyBlockMinutes": 120, "maxCourseMinutesPerDay": 120 },
  "dailyStudyMinutes": { "Monday": 360 },
  "courseFocus": [{ "courseCode": "MN 374", "priority": 9, "creditHours": 3, "reason": "CWA critical" }],
  "learningRoute": [{ "courseCode": "MN 374", "courseName": "...", "creditHours": 3, "prepFor": "...", "day": "Tuesday", "classStart": "09:00", "hoursUntil": 20, "suggestedFocus": "...", "priority": 9 }],
  "dailyPlaybooks": [{
    "day": "Monday",
    "headline": "Tonight: prep MN 376 for Tuesday",
    "tomorrowPreview": "Tuesday starts with MN 376 at 9am — 3 cr priority",
    "intents": [{
      "courseCode": "MN 376",
      "courseName": "Surface Mine Planning",
      "minutes": 90,
      "prepFor": "Tuesday 09:00 class",
      "activity": "Review problem set 3 and last lecture slides",
      "priority": 9,
      "creditHours": 3,
      "eveningOnly": true
    }]
  }]
}

Hard rules:
- Max ${prefs.maxCourseMinutesPerDay} minutes per course per day.
- Max ${prefs.maxStudyBlockMinutes} minutes per study block.
- Total daily study near ${prefs.dailyBudgetMinutes} minutes, not every free gap.
- 3-credit courses (MN 372, MN 374, MN 376, MN 350) get most time — mention CWA impact.
- dailyPlaybooks must cover: ${planningDays.join(', ')}.
- intents.activity must be specific (not "prep for class").

Course catalog:
${summarizeCourseCatalog(sharedClasses)}

Baseline playbooks (improve these):
${JSON.stringify(baselinePlaybooks.slice(0, 3), null, 2)}

Baseline learning route:
${JSON.stringify(baselineRoute.nextSteps.slice(0, 5), null, 2)}

Preferences:
${JSON.stringify(prefs, null, 2)}

Timetable:
${summarizeClasses(sharedClasses)}

Recent feedback:
${summarizeFeedback(profile)}`;
}

export function toGenerationOptions(
  optimization: PlannerAiOptimization
): PlannerGenerationOptions {
  return {
    dailyBudgetByDay: optimization.dailyStudyMinutes,
    studyIntentsByDay: playbooksToGenerationOptions(optimization.dailyPlaybooks),
  };
}

function mergeLearningRoutes(
  baseline: ReturnType<typeof predictLearningRoute>,
  aiSteps: LearningRouteStep[] | undefined
): LearningRouteStep[] {
  if (!aiSteps?.length) return baseline.nextSteps;

  const byKey = new Map<string, LearningRouteStep>();
  for (const step of baseline.nextSteps) {
    byKey.set(`${step.courseCode}|${step.day}|${step.classStart}`, step);
  }
  for (const step of aiSteps) {
    const key = `${normalizeCourseCode(step.courseCode)}|${step.day}|${step.classStart}`;
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...step,
      courseCode: normalizeCourseCode(step.courseCode),
      creditHours: step.creditHours ?? getCourseCredits(step.courseCode),
      priority: clamp(Math.round(step.priority ?? existing?.priority ?? 5), 1, 10),
    });
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.priority - a.priority || a.hoursUntil - b.hoursUntil)
    .slice(0, 8);
}

function buildDeterministicOptimization(
  prefs: StudyPreferences,
  sharedClasses: ClassEntry[],
  baselineRoute: ReturnType<typeof predictLearningRoute>,
  baselinePlaybooks: DailyPlaybook[],
  routeWeights: Record<string, number>
): PlannerAiOptimization {
  const days = getPlanningDays(prefs);
  const dailyStudyMinutes: Partial<Record<DayOfWeek, number>> = {};
  for (const day of days) {
    dailyStudyMinutes[day] = prefs.dailyBudgetMinutes;
  }

  return {
    summary:
      'Smart plan built from your timetable: ~6h/day, max 2h per course, evening blocks prep tomorrow. 3-credit courses prioritized for CWA.',
    tips: [
      'Regenerate after the admin updates the class schedule.',
      'Use evening study blocks to prep for tomorrow’s first classes.',
      'Focus extra time on 3-credit courses — they weigh most on CWA.',
    ],
    preferences: {},
    dailyStudyMinutes,
    courseFocus: normalizeCourseFocus(undefined, sharedClasses, routeWeights),
    learningRoute: baselineRoute.nextSteps,
    dailyPlaybooks: baselinePlaybooks,
    weeklyStudyTargets: baselineRoute.weeklyStudyTargets,
    generatedAt: Date.now(),
  };
}

function buildOptimizationFromAi(
  raw: RawAiResponse,
  prefs: StudyPreferences,
  sharedClasses: ClassEntry[],
  baselineRoute: ReturnType<typeof predictLearningRoute>,
  baselinePlaybooks: DailyPlaybook[],
  routeWeights: Record<string, number>
): PlannerAiOptimization {
  const preferences = normalizePreferences(raw.preferences, prefs);
  const mergedPrefs = { ...prefs, ...preferences };

  const validatedPlaybooks = validateDailyPlaybooks(
    raw.dailyPlaybooks,
    sharedClasses,
    mergedPrefs,
    baselinePlaybooks
  );
  const dailyPlaybooks = mergePlaybookIntentsWithFallback(
    validatedPlaybooks,
    sharedClasses,
    mergedPrefs
  );

  const learningRoute = mergeLearningRoutes(baselineRoute, raw.learningRoute);

  return {
    summary: String(
      raw.summary ??
        'Your plan spreads ~6 hours of study across courses, prioritizing 3-credit classes and tomorrow prep in the evening.'
    ).slice(0, 600),
    tips: Array.isArray(raw.tips)
      ? raw.tips.map((tip) => String(tip).slice(0, 200)).slice(0, 5)
      : [],
    preferences,
    dailyStudyMinutes: normalizeDailyBudgets(raw.dailyStudyMinutes, mergedPrefs),
    courseFocus: normalizeCourseFocus(raw.courseFocus, sharedClasses, routeWeights),
    learningRoute,
    dailyPlaybooks,
    weeklyStudyTargets: baselineRoute.weeklyStudyTargets,
    generatedAt: Date.now(),
  };
}

export async function optimizeStudyPlan(
  prefs: StudyPreferences,
  profile: StudyProfile,
  sharedClasses: ClassEntry[],
  _personalClasses: ClassEntry[]
): Promise<{ optimization: PlannerAiOptimization; aiWarning?: string }> {
  const baselineRoute = predictLearningRoute(sharedClasses);
  const routeWeights = learningRouteToCourseWeights(baselineRoute);
  const baselinePlaybooks = buildWeekPlaybooks(sharedClasses, prefs);

  if (!isPlannerLlmConfigured()) {
    return {
      optimization: buildDeterministicOptimization(
        prefs,
        sharedClasses,
        baselineRoute,
        baselinePlaybooks,
        routeWeights
      ),
    };
  }

  const prompt = buildPrompt(
    prefs,
    profile,
    sharedClasses,
    baselinePlaybooks,
    baselineRoute
  );

  try {
    const raw = await generatePlannerJson<RawAiResponse>(prompt);
    return {
      optimization: buildOptimizationFromAi(
        raw,
        prefs,
        sharedClasses,
        baselineRoute,
        baselinePlaybooks,
        routeWeights
      ),
    };
  } catch (error) {
    return {
      optimization: buildDeterministicOptimization(
        prefs,
        sharedClasses,
        baselineRoute,
        baselinePlaybooks,
        routeWeights
      ),
      aiWarning: friendlyAiError(error),
    };
  }
}
