import {
  getCourseCredits,
  getCourseName,
  normalizeCourseCode,
  recommendedWeeklyStudyMinutes,
} from './course-catalog';
import type { ClassEntry, ClassType, DayOfWeek, LearningRouteStep } from './types';
import { DAYS } from './types';
import { formatTime12, timeToMinutes } from './utils';

const TEACHING_TYPES: ClassType[] = ['CLASS_PHYSICAL', 'CLASS_VLE', 'PRACTICAL'];

const JS_DAY_TO_OUR: Record<number, DayOfWeek> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function teachingSessions(sharedClasses: ClassEntry[]): ClassEntry[] {
  return sharedClasses
    .filter((c) => c.isDefault && TEACHING_TYPES.includes(c.type))
    .sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
}

function nextClassDateTime(day: DayOfWeek, startTime: string, from: Date): Date {
  const targetJs = DAYS.indexOf(day) === 6 ? 0 : DAYS.indexOf(day) + 1;
  const result = new Date(from);
  result.setSeconds(0, 0);

  const [h, m] = startTime.split(':').map(Number);
  const currentJs = from.getDay();
  let daysAhead = targetJs - currentJs;
  if (daysAhead < 0) daysAhead += 7;

  const candidate = new Date(result);
  candidate.setDate(result.getDate() + daysAhead);
  candidate.setHours(h, m, 0, 0);

  if (daysAhead === 0 && candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate;
}

function hoursUntil(from: Date, target: Date): number {
  return Math.max(0, (target.getTime() - from.getTime()) / (1000 * 60 * 60));
}

function prepTypeLabel(type: ClassType): string {
  if (type === 'PRACTICAL') return 'practical prep';
  if (type === 'CLASS_VLE') return 'VLE prep';
  return 'class prep';
}

function buildSuggestedFocus(cls: ClassEntry, hours: number): string {
  const credits = getCourseCredits(cls.courseCode);
  const code = normalizeCourseCode(cls.courseCode);

  if (cls.type === 'PRACTICAL') {
    return credits >= 3
      ? `Review ${code} theory and lab checklist before practical.`
      : `Skim ${code} notes and gather materials for practical.`;
  }

  if (hours <= 12) {
    return credits === 3
      ? `Deep review: ${code} slides, past questions, and assignments before class.`
      : `Review ${code} lecture notes and key definitions before class.`;
  }

  if (hours <= 36) {
    return credits === 3
      ? `Start ${code} problem sets and consolidate last lecture.`
      : `Light ${code} reading and outline topics for upcoming session.`;
  }

  return credits === 3
    ? `Weekly ${code} consolidation — priority ${credits}-credit course.`
    : `Catch up on ${code} readings ahead of schedule.`;
}

function urgencyScore(cls: ClassEntry, hours: number): number {
  const credits = getCourseCredits(cls.courseCode);
  let score = creditHoursToUrgency(credits);

  if (hours <= 6) score += 5;
  else if (hours <= 18) score += 3;
  else if (hours <= 36) score += 1;

  if (cls.type === 'PRACTICAL') score += 1.5;
  if (cls.type === 'CLASS_VLE') score += 0.5;

  return score;
}

function creditHoursToUrgency(credits: 1 | 2 | 3): number {
  if (credits === 3) return 10;
  if (credits === 2) return 7;
  return 4;
}

export interface LearningRoute {
  generatedAt: number;
  nextSteps: LearningRouteStep[];
  weeklyStudyTargets: {
    courseCode: string;
    courseName: string;
    creditHours: 1 | 2 | 3;
    recommendedMinutes: number;
  }[];
}

export function predictLearningRoute(
  sharedClasses: ClassEntry[],
  from: Date = new Date()
): LearningRoute {
  const sessions = teachingSessions(sharedClasses);
  const seen = new Set<string>();

  const scored = sessions
    .map((cls) => {
      const when = nextClassDateTime(cls.day, cls.startTime, from);
      const hours = hoursUntil(from, when);
      const key = `${normalizeCourseCode(cls.courseCode)}|${cls.day}|${cls.startTime}|${cls.type}`;
      if (seen.has(key)) return null;
      seen.add(key);

      return {
        cls,
        when,
        hours,
        score: urgencyScore(cls, hours),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.when.getTime() - b.when.getTime();
    });

  const nextSteps: LearningRouteStep[] = scored.slice(0, 8).map((item) => {
    const credits = getCourseCredits(item.cls.courseCode);
    const code = normalizeCourseCode(item.cls.courseCode);
    return {
      courseCode: code,
      courseName: getCourseName(code, sharedClasses),
      creditHours: credits,
      prepFor: `${item.cls.day} ${formatTime12(item.cls.startTime)} ${prepTypeLabel(item.cls.type)}`,
      day: item.cls.day,
      classStart: item.cls.startTime,
      hoursUntil: Math.round(item.hours * 10) / 10,
      suggestedFocus: buildSuggestedFocus(item.cls, item.hours),
      priority: Math.min(10, Math.round(item.score)),
    };
  });

  const courseCodes = new Set<string>();
  for (const cls of sessions) {
    const code = normalizeCourseCode(cls.courseCode);
    if (code !== 'REST' && code !== 'STUDY') courseCodes.add(code);
  }

  const weeklyStudyTargets = Array.from(courseCodes)
    .map((code) => {
      const credits = getCourseCredits(code);
      return {
        courseCode: code,
        courseName: getCourseName(code, sharedClasses),
        creditHours: credits,
        recommendedMinutes: recommendedWeeklyStudyMinutes(credits),
      };
    })
    .sort((a, b) => b.creditHours - a.creditHours || a.courseCode.localeCompare(b.courseCode));

  return {
    generatedAt: from.getTime(),
    nextSteps,
    weeklyStudyTargets,
  };
}

export function learningRouteToCourseWeights(
  route: LearningRoute
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const step of route.nextSteps) {
    weights[step.courseCode] = Math.max(weights[step.courseCode] ?? 0, step.priority);
  }
  for (const target of route.weeklyStudyTargets) {
    const base = target.creditHours === 3 ? 8 : target.creditHours === 2 ? 6 : 4;
    weights[target.courseCode] = Math.max(weights[target.courseCode] ?? 0, base);
  }
  return weights;
}

export function currentPlanningDay(from: Date = new Date()): DayOfWeek {
  return JS_DAY_TO_OUR[from.getDay()];
}
