import { getCourseCredits, normalizeCourseCode } from './course-catalog';
import { buildDayAgenda } from './study-agenda';
import type {
  ClassEntry,
  DailyPlaybook,
  DayOfWeek,
  StudyIntent,
  StudyPreferences,
} from './types';
import { DAYS } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function knownCodes(sharedClasses: ClassEntry[]): Set<string> {
  const codes = new Set<string>();
  for (const cls of sharedClasses) {
    if (!cls.isDefault || cls.type === 'REST' || cls.type === 'STUDY') continue;
    codes.add(normalizeCourseCode(cls.courseCode));
  }
  return codes;
}

export function validateStudyIntent(
  raw: StudyIntent,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences
): StudyIntent | null {
  const codes = knownCodes(sharedClasses);
  const code = normalizeCourseCode(raw.courseCode);
  if (!codes.has(code)) return null;

  const credits = getCourseCredits(code);
  const minutes = clamp(
    Math.round(raw.minutes),
    prefs.minStudyBlockMinutes,
    prefs.maxStudyBlockMinutes
  );

  return {
    courseCode: code,
    courseName: raw.courseName || code,
    minutes,
    prepFor: String(raw.prepFor ?? `Upcoming ${code} class`).slice(0, 120),
    activity: String(raw.activity ?? `Review ${code} materials.`).slice(0, 200),
    priority: clamp(Math.round(raw.priority ?? 5), 1, 10),
    creditHours: credits,
    targetDay: raw.targetDay,
    targetClassStart: raw.targetClassStart,
    eveningOnly: Boolean(raw.eveningOnly),
  };
}

export function validateDayIntents(
  raw: StudyIntent[] | undefined,
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences
): StudyIntent[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const valid: StudyIntent[] = [];
  const perCourse = new Map<string, number>();
  let total = 0;
  const budget = prefs.dailyBudgetMinutes;

  for (const item of raw) {
    const intent = validateStudyIntent(item, sharedClasses, prefs);
    if (!intent) continue;

    const used = perCourse.get(intent.courseCode) ?? 0;
    if (used + intent.minutes > prefs.maxCourseMinutesPerDay) continue;
    if (total + intent.minutes > budget) continue;

    valid.push(intent);
    perCourse.set(intent.courseCode, used + intent.minutes);
    total += intent.minutes;
  }

  return valid;
}

export function validateDailyPlaybooks(
  raw: DailyPlaybook[] | undefined,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  fallback: DailyPlaybook[]
): DailyPlaybook[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;

  const result: DailyPlaybook[] = [];

  for (const day of DAYS) {
    const fb = fallback.find((p) => p.day === day);
    const incoming = raw.find((p) => p.day === day);

    if (!incoming) {
      if (fb) result.push(fb);
      continue;
    }

    const intents = validateDayIntents(incoming.intents, day, sharedClasses, prefs);
    if (intents.length === 0 && fb) {
      result.push(fb);
      continue;
    }

    result.push({
      day,
      headline: String(incoming.headline ?? fb?.headline ?? '').slice(0, 300),
      tomorrowPreview: String(incoming.tomorrowPreview ?? fb?.tomorrowPreview ?? '').slice(
        0,
        300
      ),
      intents: intents.length > 0 ? intents : (fb?.intents ?? []),
    });
  }

  return result.length > 0 ? result : fallback;
}

export function playbooksToGenerationOptions(
  playbooks: DailyPlaybook[]
): Partial<Record<DayOfWeek, StudyIntent[]>> {
  const map: Partial<Record<DayOfWeek, StudyIntent[]>> = {};
  for (const pb of playbooks) {
    if (pb.intents.length > 0) map[pb.day] = pb.intents;
  }
  return map;
}

export function mergePlaybookIntentsWithFallback(
  playbooks: DailyPlaybook[],
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences
): DailyPlaybook[] {
  return playbooks.map((pb) => {
    if (pb.intents.length >= 2) return pb;
    const fallbackIntents = buildDayAgenda(pb.day, sharedClasses, prefs);
    return {
      ...pb,
      intents: pb.intents.length > 0 ? pb.intents : fallbackIntents,
    };
  });
}
