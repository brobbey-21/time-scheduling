import {
  getActivityWindows,
  isValidWakeSleep,
  PLANNER_VERSION,
} from './study-profile';
import type { ClassEntry, ClassType, DayOfWeek, StudyPreferences } from './types';
import { DAYS } from './types';
import { formatRestLabel, formatTime12, timeToMinutes } from './utils';

interface TimeInterval {
  start: number;
  end: number;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function daySlug(day: DayOfWeek): string {
  return day.toLowerCase().slice(0, 3);
}

function resolvePlanningDays(prefs: StudyPreferences): DayOfWeek[] {
  if (prefs.planWeekends) return [...DAYS];
  return DAYS.filter((d) => d !== 'Saturday' && d !== 'Sunday');
}

export function getPlanningDays(prefs: StudyPreferences): DayOfWeek[] {
  return resolvePlanningDays(prefs);
}

const TEACHING_TYPES: ClassType[] = [
  'CLASS_PHYSICAL',
  'CLASS_VLE',
  'PRACTICAL',
];

function getOfficialClassesForDay(
  sharedClasses: ClassEntry[],
  day: DayOfWeek
): ClassEntry[] {
  return sharedClasses
    .filter((c) => c.isDefault && c.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** Teaching sessions only — used to label study blocks per course. */
function getTeachingClassesForDay(
  sharedClasses: ClassEntry[],
  day: DayOfWeek
): ClassEntry[] {
  return getOfficialClassesForDay(sharedClasses, day).filter((c) =>
    TEACHING_TYPES.includes(c.type)
  );
}

function getOccupiedIntervals(classes: ClassEntry[]): TimeInterval[] {
  return classes.map((c) => ({
    start: timeToMinutes(c.startTime),
    end: timeToMinutes(c.endTime),
  }));
}

function getFreeIntervalsInWindow(
  windowStart: number,
  windowEnd: number,
  occupied: TimeInterval[],
  minSlotMinutes: number
): TimeInterval[] {
  const clipped = occupied
    .filter((b) => b.end > windowStart && b.start < windowEnd)
    .map((b) => ({
      start: Math.max(b.start, windowStart),
      end: Math.min(b.end, windowEnd),
    }))
    .sort((a, b) => a.start - b.start);

  const free: TimeInterval[] = [];
  let cursor = windowStart;

  for (const block of clipped) {
    if (block.start > cursor) {
      const end = Math.min(block.start, windowEnd);
      if (end - cursor >= minSlotMinutes) {
        free.push({ start: cursor, end });
      }
    }
    cursor = Math.max(cursor, block.end);
    if (cursor >= windowEnd) break;
  }

  if (cursor < windowEnd && windowEnd - cursor >= minSlotMinutes) {
    free.push({ start: cursor, end: windowEnd });
  }

  return free;
}

function getFreeIntervals(
  windows: TimeInterval[],
  occupied: TimeInterval[],
  minSlotMinutes: number
): TimeInterval[] {
  return windows.flatMap((window) =>
    getFreeIntervalsInWindow(
      window.start,
      window.end,
      occupied,
      minSlotMinutes
    )
  );
}

function pickCourseLabel(
  blockStart: number,
  day: DayOfWeek,
  sharedClasses: ClassEntry[]
): { courseCode: string; courseName: string; notes: string } {
  const dayClasses = getTeachingClassesForDay(sharedClasses, day);
  const upcoming = dayClasses.find(
    (c) => timeToMinutes(c.startTime) > blockStart
  );
  if (upcoming) {
    return {
      courseCode: upcoming.courseCode,
      courseName: upcoming.courseName,
      notes: `Prep for ${upcoming.courseCode} class.`,
    };
  }

  const dayIndex = DAYS.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const nextDay = DAYS[(dayIndex + i) % 7];
    const nextDayClasses = getTeachingClassesForDay(sharedClasses, nextDay);
    if (nextDayClasses.length > 0) {
      const first = nextDayClasses[0];
      return {
        courseCode: first.courseCode,
        courseName: first.courseName,
        notes: `Prep for ${nextDay} ${first.courseCode}.`,
      };
    }
  }

  return {
    courseCode: 'STUDY',
    courseName: 'Study Block',
    notes: 'Focused study session.',
  };
}

function chooseStudyDuration(
  slotLength: number,
  remainingBudget: number,
  prefs: StudyPreferences
): number {
  const max = Math.min(
    prefs.maxStudyBlockMinutes,
    slotLength,
    remainingBudget
  );
  if (max < prefs.minStudyBlockMinutes) return 0;

  if (max >= prefs.maxStudyBlockMinutes) return prefs.maxStudyBlockMinutes;
  if (max >= 75) return 75;
  if (max >= prefs.minStudyBlockMinutes) return prefs.minStudyBlockMinutes;
  return max;
}

function fillInterval(
  interval: TimeInterval,
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  budgetRemaining: number,
  blockIndex: { value: number }
): { blocks: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[]; studyMinutes: number } {
  const blocks: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] = [];
  let cursor = interval.start;
  let studyMinutes = 0;
  let remaining = budgetRemaining;
  let needsBreak = false;

  while (remaining > 0 && cursor < interval.end) {
    const slotLeft = interval.end - cursor;
    if (needsBreak && slotLeft >= prefs.breakMinutes) {
      const breakEnd = Math.min(cursor + prefs.breakMinutes, interval.end);
      const startTime = minutesToTime(cursor);
      const endTime = minutesToTime(breakEnd);
      blocks.push({
        id: `plan-${daySlug(day)}-${blockIndex.value++}`,
        courseCode: 'REST',
        courseName: formatRestLabel(startTime, endTime),
        day,
        startTime,
        endTime,
        venue: '',
        lecturer: '',
        type: 'REST',
        notificationEnabled: true,
        notificationMinsBefore: 0,
        notes: `Until ${formatTime12(endTime)}. You'll be reminded when this break ends.`,
        isDefault: false,
        plannerGenerated: true,
        plannerVersion: PLANNER_VERSION,
      });
      cursor = breakEnd;
      needsBreak = false;
      continue;
    }

    const duration = chooseStudyDuration(slotLeft, remaining, prefs);
    if (duration === 0) break;

    const label = pickCourseLabel(cursor, day, sharedClasses);
    const end = cursor + duration;

    blocks.push({
      id: `plan-${daySlug(day)}-${blockIndex.value++}`,
      courseCode: label.courseCode,
      courseName: label.courseName,
      day,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(end),
      venue: '',
      lecturer: '',
      type: 'STUDY',
      notificationEnabled: true,
      notificationMinsBefore: 5,
      notes: label.notes,
      isDefault: false,
      plannerGenerated: true,
      plannerVersion: PLANNER_VERSION,
    });

    studyMinutes += duration;
    remaining -= duration;
    cursor = end;
    needsBreak = remaining > 0;
  }

  return { blocks, studyMinutes };
}

export function previewDayPlan(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences
): { studyMinutes: number; blockCount: number } {
  const generated = generateDayPlan(day, sharedClasses, prefs);
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
  prefs: StudyPreferences
): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  if (!isValidWakeSleep(prefs.wakeTime, prefs.sleepTime)) return [];

  const windows = getActivityWindows(prefs.wakeTime, prefs.sleepTime);
  const official = getOfficialClassesForDay(sharedClasses, day);
  const occupied = getOccupiedIntervals(official);
  const free = getFreeIntervals(
    windows,
    occupied,
    prefs.minStudyBlockMinutes
  );

  const totalFree = free.reduce((sum, f) => sum + (f.end - f.start), 0);
  const budget = Math.min(prefs.dailyBudgetMinutes, totalFree);
  if (budget < prefs.minStudyBlockMinutes) return [];

  const sortedFree = [...free].sort(
    (a, b) => b.end - b.start - (a.end - a.start)
  );

  const blocks: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] = [];
  let budgetRemaining = budget;
  const blockIndex = { value: 0 };

  for (const interval of sortedFree) {
    if (budgetRemaining < prefs.minStudyBlockMinutes) break;
    const result = fillInterval(
      interval,
      day,
      sharedClasses,
      prefs,
      budgetRemaining,
      blockIndex
    );
    blocks.push(...result.blocks);
    budgetRemaining -= result.studyMinutes;
  }

  return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function generateWeekPlan(
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences
): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  const days = resolvePlanningDays(prefs);
  return days
    .flatMap((day) => generateDayPlan(day, sharedClasses, prefs))
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
  }));
  return [...personal, ...stamped];
}
