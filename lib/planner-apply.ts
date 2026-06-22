import {
  composeSchedule,
  getPersonalClasses,
  getSharedClasses,
} from './schedule-utils';
import { saveStudyPreferences } from './study-profile-sync';
import {
  generateDayPlan,
  generateWeekPlan,
  mergePlannerBlocks,
  stripPlannerBlocks,
  stripPlannerBlocksForDay,
} from './study-planner';
import { getAllClasses, replaceAllClasses } from './db';
import {
  creditsMapFromRegistry,
  fetchCourseRegistry,
} from './course-registry-client';
import { normalizeCourseCode, setCourseCreditOverrides } from './course-catalog';
import type { DayOfWeek, PlannerGenerationOptions, StudyPreferences } from './types';

async function applyCreditRegistry(): Promise<void> {
  const entries = await fetchCourseRegistry();
  const raw = creditsMapFromRegistry(entries);
  const map: Record<string, 1 | 2 | 3> = {};
  for (const [code, credits] of Object.entries(raw)) {
    map[normalizeCourseCode(code)] = credits;
  }
  setCourseCreditOverrides(map);
}

async function pushPersonalAfterReplace(): Promise<void> {
  const { scheduleClassPush, notifyClassesChanged } = await import('./class-sync');
  scheduleClassPush();
  notifyClassesChanged();
}

export async function applyWeekPlan(
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): Promise<number> {
  await applyCreditRegistry();
  const all = await getAllClasses();
  const shared = getSharedClasses(all);
  const personal = stripPlannerBlocks(getPersonalClasses(all));
  const generated = generateWeekPlan(shared, prefs, options);
  const merged = mergePlannerBlocks(personal, generated);

  await replaceAllClasses(composeSchedule(shared, merged));
  await pushPersonalAfterReplace();

  const now = Date.now();
  await saveStudyPreferences(
    {
      ...prefs,
      lastGeneratedAt: now,
      setupCompletedAt: prefs.setupCompletedAt ?? now,
    },
    [{ type: 'regenerated_week' }]
  );

  return generated.length;
}

export async function applyDayPlan(
  day: DayOfWeek,
  prefs: StudyPreferences
): Promise<number> {
  await applyCreditRegistry();
  const all = await getAllClasses();
  const shared = getSharedClasses(all);
  const personal = stripPlannerBlocksForDay(getPersonalClasses(all), day);
  const generated = generateDayPlan(day, shared, prefs);
  const merged = mergePlannerBlocks(personal, generated);

  await replaceAllClasses(composeSchedule(shared, merged));
  await pushPersonalAfterReplace();

  await saveStudyPreferences(
    { ...prefs, lastGeneratedAt: Date.now() },
    [{ type: 'regenerated_day', day }]
  );

  return generated.length;
}
