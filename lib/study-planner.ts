import {
  getActivityWindows,
  isValidWakeSleep,
  PLANNER_VERSION,
} from './study-profile';
import { generateDayPlanFromAgenda, getFreeSlotsForDay } from './study-placement';
import type { ClassEntry, ClassType, DayOfWeek, StudyPreferences } from './types';
import type { PlannerGenerationOptions } from './types';
import { DAYS } from './types';
import { timeToMinutes } from './utils';

export { buildDayAgenda, buildDayPlaybook, buildWeekPlaybooks } from './study-agenda';

const TEACHING_TYPES: ClassType[] = ['CLASS_PHYSICAL', 'CLASS_VLE', 'PRACTICAL'];

function resolvePlanningDays(prefs: StudyPreferences): DayOfWeek[] {
  if (prefs.planWeekends) return [...DAYS];
  return DAYS.filter((d) => d !== 'Saturday' && d !== 'Sunday');
}

export function getPlanningDays(prefs: StudyPreferences): DayOfWeek[] {
  return resolvePlanningDays(prefs);
}

function getOfficialClassesForDay(
  sharedClasses: ClassEntry[],
  day: DayOfWeek
): ClassEntry[] {
  return sharedClasses
    .filter((c) => c.isDefault && c.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function previewDayPlan(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): { studyMinutes: number; blockCount: number } {
  const generated = generateDayPlan(day, sharedClasses, prefs, options);
  const studyMinutes = generated
    .filter((c) => c.type === 'STUDY')
    .reduce(
      (sum, c) => sum + (timeToMinutes(c.endTime) - timeToMinutes(c.startTime)),
      0
    );
  return { studyMinutes, blockCount: generated.length };
}

export function generateDayPlan(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  if (!isValidWakeSleep(prefs.wakeTime, prefs.sleepTime)) return [];

  const windows = getActivityWindows(prefs.wakeTime, prefs.sleepTime);
  const official = getOfficialClassesForDay(sharedClasses, day);
  const occupied = official.map((c) => ({
    start: timeToMinutes(c.startTime),
    end: timeToMinutes(c.endTime),
  }));

  const freeSlots = getFreeSlotsForDay(
    day,
    sharedClasses,
    prefs,
    windows,
    occupied,
    prefs.minStudyBlockMinutes
  );

  if (freeSlots.length === 0) return [];

  return generateDayPlanFromAgenda(day, sharedClasses, prefs, freeSlots, options);
}

export function generateWeekPlan(
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  const days = resolvePlanningDays(prefs);
  return days
    .flatMap((day) => generateDayPlan(day, sharedClasses, prefs, options))
    .sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
}

export function stripPlannerBlocks(classes: ClassEntry[]): ClassEntry[] {
  return classes.filter((c) => !c.plannerGenerated);
}

export function stripPlannerBlocksForDay(
  classes: ClassEntry[],
  day: DayOfWeek
): ClassEntry[] {
  return classes.filter((c) => !(c.plannerGenerated && c.day === day));
}

export function mergePlannerBlocks(
  personal: ClassEntry[],
  generated: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[]
): ClassEntry[] {
  const now = Date.now();
  const stamped = generated.map((c) => ({
    ...c,
    createdAt: now,
    updatedAt: now,
    plannerVersion: PLANNER_VERSION,
  }));
  return [...personal, ...stamped];
}

export { PLANNER_VERSION };
