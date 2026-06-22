import type { ClassEntry, ClassType, DayOfWeek } from './types';
import { DAYS } from './types';

export type CourseCreditHours = 1 | 2 | 3;

let creditOverrideMap: Record<string, CourseCreditHours> | null = null;

export function setCourseCreditOverrides(map: Record<string, CourseCreditHours>): void {
  creditOverrideMap = map;
}

export function clearCourseCreditOverrides(): void {
  creditOverrideMap = null;
}

/** MN 3C course credit hours — 3-credit core courses get more study time. */
export const MN3C_COURSE_CREDITS: Record<string, CourseCreditHours> = {
  'MN 372': 3,
  'MN 374': 3,
  'MN 376': 3,
  'MN 350': 3,
  'MN 378': 2,
  'MN 380': 2,
  'MN 382': 2,
  'MN 352': 2,
  'MN 370': 2,
  'MN 360': 2,
  'MN 392': 1,
  'MN 276': 1,
  'MN 170': 1,
  'MN 014': 1,
};

const TEACHING_TYPES: ClassType[] = ['CLASS_PHYSICAL', 'CLASS_VLE', 'PRACTICAL'];

export function normalizeCourseCode(code: string): string {
  return code.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function getCourseCredits(courseCode: string): CourseCreditHours {
  const normalized = normalizeCourseCode(courseCode);
  if (creditOverrideMap?.[normalized]) {
    return creditOverrideMap[normalized];
  }

  const key = Object.keys(MN3C_COURSE_CREDITS).find(
    (k) => normalizeCourseCode(k) === normalized
  );
  if (key) return MN3C_COURSE_CREDITS[key];
  if (/PRACT|LAB|170|014|276|392/i.test(normalized)) return 1;
  if (/372|374|376|350/.test(normalized)) return 3;
  return 2;
}

/** Base planner weight from credit load (3cr → 8, 2cr → 6, 1cr → 4). */
export function creditHoursToWeight(credits: CourseCreditHours): number {
  if (credits === 3) return 8;
  if (credits === 2) return 6;
  return 4;
}

/** Recommended weekly study minutes proportional to credit hours. */
export function recommendedWeeklyStudyMinutes(credits: CourseCreditHours): number {
  if (credits === 3) return 180;
  if (credits === 2) return 120;
  return 60;
}

export function getCourseName(
  courseCode: string,
  sharedClasses: ClassEntry[]
): string {
  const match = sharedClasses.find(
    (c) => normalizeCourseCode(c.courseCode) === normalizeCourseCode(courseCode)
  );
  return match?.courseName ?? courseCode;
}

export function buildCreditCourseWeights(
  sharedClasses: ClassEntry[]
): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const cls of sharedClasses) {
    if (!cls.isDefault || !TEACHING_TYPES.includes(cls.type)) continue;
    const code = normalizeCourseCode(cls.courseCode);
    if (code === 'REST' || code === 'STUDY') continue;
    weights[code] = Math.max(
      weights[code] ?? 0,
      creditHoursToWeight(getCourseCredits(code))
    );
  }

  return weights;
}

export function summarizeCourseCatalog(
  sharedClasses: ClassEntry[]
): string {
  const codes = new Set<string>();
  for (const cls of sharedClasses) {
    if (!cls.isDefault || !TEACHING_TYPES.includes(cls.type)) continue;
    const code = normalizeCourseCode(cls.courseCode);
    if (code !== 'REST' && code !== 'STUDY') codes.add(code);
  }

  if (codes.size === 0) return 'No teaching courses found.';

  return Array.from(codes)
    .sort()
    .map((code) => {
      const credits = getCourseCredits(code);
      const name = getCourseName(code, sharedClasses);
      return `${code} — ${name} (${credits} credit hour${credits === 1 ? '' : 's'})`;
    })
    .join('\n');
}
