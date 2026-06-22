import { normalizeCourseCode } from './course-catalog';
import type { ClassEntry } from './types';

export function scheduleSlotKey(cls: Pick<ClassEntry, 'day' | 'startTime' | 'endTime' | 'courseCode'>): string {
  return `${cls.day}|${cls.startTime}|${cls.endTime}|${normalizeCourseCode(cls.courseCode)}`;
}

function slotScore(cls: Pick<ClassEntry, 'venue' | 'lecturer' | 'isDefault' | 'courseName' | 'notes'>): number {
  let score = 0;
  if (cls.isDefault) score += 8;
  if (cls.venue?.trim()) score += 3;
  if (cls.lecturer?.trim()) score += 2;
  if (cls.notes?.trim()) score += 1;
  if (!/[\[(]/.test(cls.courseName)) score += 1;
  return score;
}

function pickPreferredClass<T extends Pick<ClassEntry, 'venue' | 'lecturer' | 'isDefault' | 'courseName' | 'notes'>>(
  a: T,
  b: T
): T {
  return slotScore(a) >= slotScore(b) ? a : b;
}

export function dedupeImportedClasses<T extends Omit<ClassEntry, 'createdAt' | 'updatedAt'>>(
  classes: T[]
): T[] {
  const map = new Map<string, T>();
  for (const cls of classes) {
    const key = scheduleSlotKey(cls);
    const existing = map.get(key);
    map.set(key, existing ? pickPreferredClass(existing, cls) : cls);
  }
  return Array.from(map.values());
}

/** Prefer official shared entries over personal copies at the same slot. */
export function dedupeScheduleClasses(classes: ClassEntry[]): ClassEntry[] {
  const map = new Map<string, ClassEntry>();
  for (const cls of classes) {
    const key = scheduleSlotKey(cls);
    const existing = map.get(key);
    map.set(key, existing ? pickPreferredClass(existing, cls) : cls);
  }
  return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function stripPersonalOverlappingShared(
  shared: ClassEntry[],
  personal: ClassEntry[]
): ClassEntry[] {
  const sharedKeys = new Set(shared.map(scheduleSlotKey));
  return personal.filter(
    (cls) => cls.plannerGenerated || !sharedKeys.has(scheduleSlotKey(cls))
  );
}
