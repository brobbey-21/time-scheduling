import {
  getCourseCredits,
  getCourseName,
  normalizeCourseCode,
} from './course-catalog';
import type {
  ClassEntry,
  ClassType,
  DailyPlaybook,
  DayOfWeek,
  PlannerGenerationOptions,
  StudyIntent,
  StudyPreferences,
} from './types';
import { DAYS } from './types';
import { formatTime12 } from './utils';

const TEACHING_TYPES: ClassType[] = ['CLASS_PHYSICAL', 'CLASS_VLE', 'PRACTICAL'];

function nextDay(day: DayOfWeek): DayOfWeek {
  const i = DAYS.indexOf(day);
  return DAYS[(i + 1) % 7];
}

function teachingOnDay(sharedClasses: ClassEntry[], day: DayOfWeek): ClassEntry[] {
  return sharedClasses
    .filter((c) => c.isDefault && c.day === day && TEACHING_TYPES.includes(c.type))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function prepLabel(cls: ClassEntry): string {
  const type =
    cls.type === 'PRACTICAL'
      ? 'practical'
      : cls.type === 'CLASS_VLE'
        ? 'VLE class'
        : 'class';
  return `${cls.day} ${formatTime12(cls.startTime)} ${type}`;
}

function buildActivity(cls: ClassEntry, credits: 1 | 2 | 3): string {
  if (cls.type === 'PRACTICAL') {
    return credits >= 3
      ? `Review ${cls.courseCode} theory and lab checklist.`
      : `Skim ${cls.courseName} notes before practical.`;
  }
  if (credits === 3) {
    return `Deep review: ${cls.courseCode} slides, past questions, assignments.`;
  }
  return `Review ${cls.courseCode} lecture notes and key topics.`;
}

function creditPriority(credits: 1 | 2 | 3, prioritizeHighCredit: boolean): number {
  if (!prioritizeHighCredit) return 5;
  if (credits === 3) return 10;
  if (credits === 2) return 7;
  return 4;
}

function splitMinutesIntoChunks(
  total: number,
  minChunk: number,
  maxChunk: number
): number[] {
  const chunks: number[] = [];
  let left = total;
  while (left >= minChunk) {
    const chunk = Math.min(maxChunk, left);
    if (chunk < minChunk && chunks.length > 0) {
      chunks[chunks.length - 1] += left;
      break;
    }
    chunks.push(chunk);
    left -= chunk;
  }
  return chunks;
}

interface CourseTarget {
  cls: ClassEntry;
  credits: 1 | 2 | 3;
  eveningOnly: boolean;
  score: number;
}

function buildTargets(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences
): CourseTarget[] {
  const targets: CourseTarget[] = [];
  const seen = new Set<string>();

  for (const cls of teachingOnDay(sharedClasses, day)) {
    const code = normalizeCourseCode(cls.courseCode);
    const key = `${code}|${day}|${cls.startTime}|day`;
    if (seen.has(key)) continue;
    seen.add(key);
    const credits = getCourseCredits(code);
    targets.push({
      cls,
      credits,
      eveningOnly: false,
      score: creditPriority(credits, prefs.prioritizeHighCredit) + 2,
    });
  }

  if (prefs.eveningPrepNextDay) {
    const tomorrow = nextDay(day);
    for (const cls of teachingOnDay(sharedClasses, tomorrow)) {
      const code = normalizeCourseCode(cls.courseCode);
      const key = `${code}|${tomorrow}|${cls.startTime}|eve`;
      if (seen.has(key)) continue;
      seen.add(key);
      const credits = getCourseCredits(code);
      targets.push({
        cls,
        credits,
        eveningOnly: true,
        score: creditPriority(credits, prefs.prioritizeHighCredit) + 1,
      });
    }
  }

  return targets.sort((a, b) => b.score - a.score || a.cls.startTime.localeCompare(b.cls.startTime));
}

export function buildDayAgenda(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): StudyIntent[] {
  const custom = options?.studyIntentsByDay?.[day];
  if (custom?.length) return custom;

  const budget = options?.dailyBudgetByDay?.[day] ?? prefs.dailyBudgetMinutes;
  const maxPerCourse = prefs.maxCourseMinutesPerDay;
  const targets = buildTargets(day, sharedClasses, prefs);

  const courseAllocated = new Map<string, number>();
  const intents: StudyIntent[] = [];
  let totalAllocated = 0;

  for (const target of targets) {
    if (totalAllocated >= budget) break;

    const code = normalizeCourseCode(target.cls.courseCode);
    const already = courseAllocated.get(code) ?? 0;
    if (already >= maxPerCourse) continue;

    const credits = target.credits;
    const share =
      credits === 3 ? 0.22 : credits === 2 ? 0.14 : 0.08;
    let minutes = Math.min(
      maxPerCourse - already,
      Math.round(budget * share),
      budget - totalAllocated
    );

    if (minutes < prefs.minStudyBlockMinutes) {
      if (credits === 3 && budget - totalAllocated >= prefs.minStudyBlockMinutes) {
        minutes = Math.min(
          maxPerCourse - already,
          prefs.minStudyBlockMinutes,
          budget - totalAllocated
        );
      } else {
        continue;
      }
    }

    const chunks = splitMinutesIntoChunks(
      minutes,
      prefs.minStudyBlockMinutes,
      prefs.maxStudyBlockMinutes
    );

    for (const chunk of chunks) {
      if (totalAllocated + chunk > budget) break;
      const newTotal = (courseAllocated.get(code) ?? 0) + chunk;
      if (newTotal > maxPerCourse) break;

      intents.push({
        courseCode: code,
        courseName: getCourseName(code, sharedClasses),
        minutes: chunk,
        prepFor: prepLabel(target.cls),
        activity: buildActivity(target.cls, credits),
        priority: target.score,
        creditHours: credits,
        targetDay: target.cls.day,
        targetClassStart: target.cls.startTime,
        eveningOnly: target.eveningOnly,
      });

      courseAllocated.set(code, newTotal);
      totalAllocated += chunk;
    }
  }

  return intents;
}

export function buildDayPlaybook(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): DailyPlaybook {
  const intents = buildDayAgenda(day, sharedClasses, prefs, options);
  const tomorrow = nextDay(day);
  const tomorrowClasses = teachingOnDay(sharedClasses, tomorrow);

  const eveningIntents = intents.filter((i) => i.eveningOnly);
  const dayIntents = intents.filter((i) => !i.eveningOnly);

  const eveningCodes = Array.from(new Set(eveningIntents.map((i) => i.courseCode)));
  const dayCodes = Array.from(new Set(dayIntents.map((i) => i.courseCode)));

  const label = (code: string) => {
    const intent = intents.find((i) => i.courseCode === code);
    return intent?.courseName || code;
  };

  let headline = 'Light study day — protect rest time between blocks.';
  if (dayCodes.length > 0 && eveningCodes.length > 0) {
    headline = `Today: ${dayCodes.slice(0, 2).map(label).join(', ')}. Tonight: prep for ${tomorrow}.`;
  } else if (eveningCodes.length > 0) {
    headline = `Tonight: prep for ${tomorrow}'s classes.`;
  } else if (dayCodes.length > 0) {
    headline = `Focus on ${dayCodes.slice(0, 3).map(label).join(', ')} before today's sessions.`;
  }

  let tomorrowPreview = `No official classes scheduled for ${tomorrow}.`;
  if (tomorrowClasses.length > 0) {
    const first = tomorrowClasses[0];
    const highCredit = tomorrowClasses.filter(
      (c) => getCourseCredits(c.courseCode) === 3
    );
    const critical =
      highCredit.length > 0
        ? ` Priority: ${highCredit
            .map((c) => `${c.courseName} (${c.courseCode})`)
            .slice(0, 2)
            .join(', ')} — high CWA impact.`
        : '';
    tomorrowPreview = `Starts with ${first.courseName} at ${formatTime12(first.startTime)}.${critical}`;
  }

  return { day, headline, tomorrowPreview, intents };
}

export function buildWeekPlaybooks(
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  options?: PlannerGenerationOptions
): DailyPlaybook[] {
  const days = prefs.planWeekends
    ? [...DAYS]
    : DAYS.filter((d) => d !== 'Saturday' && d !== 'Sunday');

  return days.map((day) => buildDayPlaybook(day, sharedClasses, prefs, options));
}
