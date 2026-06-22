import { normalizeCourseCode } from './course-catalog';
import type { CourseRegistryEntry } from './types';

let registryCache: CourseRegistryEntry[] | null = null;

export function setCourseRegistryCache(entries: CourseRegistryEntry[]): void {
  registryCache = entries;
}

export function getCourseRegistryCache(): CourseRegistryEntry[] | null {
  return registryCache;
}

export async function fetchCourseRegistry(): Promise<CourseRegistryEntry[]> {
  if (typeof window === 'undefined') return [];

  try {
    const res = await fetch('/api/courses', { cache: 'no-store' });
    if (!res.ok) return registryCache ?? [];
    const data = (await res.json()) as { courses?: CourseRegistryEntry[] };
    const courses = data.courses ?? [];
    registryCache = courses;
    return courses;
  } catch {
    return registryCache ?? [];
  }
}

export function creditsMapFromRegistry(
  entries: CourseRegistryEntry[]
): Record<string, 1 | 2 | 3> {
  const map: Record<string, 1 | 2 | 3> = {};
  for (const e of entries) {
    map[normalizeCourseCode(e.courseCode)] = e.creditHours;
  }
  return map;
}
