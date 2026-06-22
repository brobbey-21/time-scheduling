import { PLANNER_VERSION } from './study-profile';
import { buildDayAgenda } from './study-agenda';
import type {
  ClassEntry,
  DayOfWeek,
  PlannerGenerationOptions,
  StudyIntent,
  StudyPreferences,
} from './types';
import { formatRestLabel, formatTime12, timeToMinutes } from './utils';

const EVENING_START = 17 * 60;

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

export function getFreeSlotsForDay(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  windows: TimeInterval[],
  occupied: TimeInterval[],
  minSlotMinutes: number
): TimeInterval[] {
  const free: TimeInterval[] = [];

  for (const window of windows) {
    const clipped = occupied
      .filter((b) => b.end > window.start && b.start < window.end)
      .map((b) => ({
        start: Math.max(b.start, window.start),
        end: Math.min(b.end, window.end),
      }))
      .sort((a, b) => a.start - b.start);

    let cursor = window.start;
    for (const block of clipped) {
      if (block.start > cursor && block.start - cursor >= minSlotMinutes) {
        free.push({ start: cursor, end: block.start });
      }
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < window.end && window.end - cursor >= minSlotMinutes) {
      free.push({ start: cursor, end: window.end });
    }
  }

  return free.sort((a, b) => a.start - b.start);
}

function slotScore(
  slot: TimeInterval,
  intent: StudyIntent,
  duration: number
): number {
  let score = intent.priority;

  if (intent.eveningOnly) {
    if (slot.start >= EVENING_START) score += 20;
    else score -= 50;
  } else if (slot.start < EVENING_START) {
    score += 10;
  } else {
    score -= 5;
  }

  if (intent.targetClassStart && intent.targetDay) {
    const target = timeToMinutes(intent.targetClassStart);
    if (slot.end <= target && target - slot.end <= 180) {
      score += 15;
    }
  }

  if (slot.end - slot.start >= duration) score += 5;

  return score;
}

function pickSlot(
  slots: TimeInterval[],
  intent: StudyIntent,
  duration: number,
  used: TimeInterval[]
): TimeInterval | null {
  let best: TimeInterval | null = null;
  let bestScore = -Infinity;

  for (const slot of slots) {
    const length = slot.end - slot.start;
    if (length < duration) continue;

    const overlaps = used.some(
      (u) => !(u.end <= slot.start || u.start >= slot.end)
    );
    if (overlaps) continue;

    const score = slotScore(slot, intent, duration);
    if (score > bestScore) {
      bestScore = score;
      best = { start: slot.start, end: slot.start + duration };
    }
  }

  return best;
}

export function placeDayIntents(
  day: DayOfWeek,
  intents: StudyIntent[],
  freeSlots: TimeInterval[],
  prefs: StudyPreferences,
  blockIndex: { value: number }
): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  const blocks: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] = [];
  const used: TimeInterval[] = [];

  const daySlots = freeSlots.filter((s) => s.start < EVENING_START);
  const eveningSlots = freeSlots.filter((s) => s.start >= EVENING_START);

  for (const intent of intents) {
    const pool = intent.eveningOnly ? eveningSlots : daySlots;
    const placement = pickSlot(pool, intent, intent.minutes, used);
    if (!placement) continue;

    const notePrefix = intent.eveningOnly ? 'Tonight — ' : '';
    const cwaNote = intent.creditHours === 3 ? ' High CWA impact.' : '';

    blocks.push({
      id: `plan-${daySlug(day)}-${blockIndex.value++}`,
      courseCode: intent.courseCode,
      courseName: intent.courseName,
      day,
      startTime: minutesToTime(placement.start),
      endTime: minutesToTime(placement.end),
      venue: '',
      lecturer: '',
      type: 'STUDY',
      notificationEnabled: true,
      notificationMinsBefore: 5,
      notes: `${notePrefix}${intent.activity} Prep for ${intent.prepFor}.${cwaNote}`,
      isDefault: false,
      plannerGenerated: true,
      plannerVersion: PLANNER_VERSION,
    });

    used.push(placement);
  }

  return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function generateDayPlanFromAgenda(
  day: DayOfWeek,
  sharedClasses: ClassEntry[],
  prefs: StudyPreferences,
  freeSlots: TimeInterval[],
  options?: PlannerGenerationOptions
): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  const intents = buildDayAgenda(day, sharedClasses, prefs, options);
  if (intents.length === 0) return [];

  const blockIndex = { value: 0 };
  return placeDayIntents(day, intents, freeSlots, prefs, blockIndex);
}
