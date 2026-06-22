import fs from 'fs/promises';
import path from 'path';
import { MN3C_COURSE_CREDITS, normalizeCourseCode } from './course-catalog';
import { cohortStorageSlug } from './cohorts';
import type { ClassEntry, CourseRegistryEntry } from './types';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

function redisKey(cohort: string): string {
  return `shared:course-registry:${cohortStorageSlug(cohort)}`;
}

function dataFile(cohort: string): string {
  const slug = cohortStorageSlug(cohort);
  return path.join(process.cwd(), '.data', 'shared', `${slug}-courses.json`);
}

async function readRedis(key: string): Promise<CourseRegistryEntry[] | null> {
  const result = (await upstashCommand(['GET', key])) as {
    result?: string | null;
  } | null;
  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as CourseRegistryEntry[];
  } catch {
    return null;
  }
}

async function writeRedis(key: string, entries: CourseRegistryEntry[]): Promise<boolean> {
  const result = await upstashCommand(['SET', key, JSON.stringify(entries)]);
  return result !== null;
}

async function readFile(file: string): Promise<CourseRegistryEntry[] | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as CourseRegistryEntry[];
  } catch {
    return null;
  }
}

async function writeFile(file: string, entries: CourseRegistryEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(entries, null, 2), 'utf8');
}

function seedFromCatalog(schedule: ClassEntry[]): CourseRegistryEntry[] {
  const map = new Map<string, CourseRegistryEntry>();

  for (const cls of schedule) {
    if (!cls.isDefault || cls.type === 'REST' || cls.type === 'STUDY') continue;
    const code = normalizeCourseCode(cls.courseCode);
    if (code === 'REST' || code === 'STUDY') continue;

    const catalogCredits =
      MN3C_COURSE_CREDITS[cls.courseCode] ??
      MN3C_COURSE_CREDITS[code] ??
      2;

    if (!map.has(code)) {
      map.set(code, {
        courseCode: code,
        courseName: cls.courseName,
        creditHours: catalogCredits as 1 | 2 | 3,
        cwaCritical: catalogCredits === 3,
      });
    }
  }

  for (const [code, credits] of Object.entries(MN3C_COURSE_CREDITS)) {
    const normalized = normalizeCourseCode(code);
    if (!map.has(normalized)) {
      map.set(normalized, {
        courseCode: normalized,
        courseName: code,
        creditHours: credits,
        cwaCritical: credits === 3,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );
}

export async function getCourseRegistry(
  cohort: string,
  schedule: ClassEntry[] = []
): Promise<CourseRegistryEntry[]> {
  const key = redisKey(cohort);
  const file = dataFile(cohort);

  const fromRedis = await readRedis(key);
  if (fromRedis && fromRedis.length > 0) return fromRedis;

  const fromFile = await readFile(file);
  if (fromFile && fromFile.length > 0) return fromFile;

  const seeded = seedFromCatalog(schedule);
  if (seeded.length > 0) {
    await saveCourseRegistry(cohort, seeded);
  }
  return seeded;
}

export async function saveCourseRegistry(
  cohort: string,
  entries: CourseRegistryEntry[]
): Promise<boolean> {
  assertPersistentStorage();
  const normalized = entries.map((e) => ({
    ...e,
    courseCode: normalizeCourseCode(e.courseCode),
    cwaCritical: e.cwaCritical ?? e.creditHours === 3,
  }));

  const key = redisKey(cohort);
  const file = dataFile(cohort);

  if (isUpstashConfigured()) {
    const ok = await writeRedis(key, normalized);
    if (ok) return true;
  }
  await writeFile(file, normalized);
  return true;
}

export function registryFromSchedule(schedule: ClassEntry[]): CourseRegistryEntry[] {
  const map = new Map<string, CourseRegistryEntry>();

  for (const cls of schedule) {
    if (!cls.isDefault || cls.type === 'REST' || cls.type === 'STUDY') continue;
    const code = normalizeCourseCode(cls.courseCode);
    if (code === 'REST' || code === 'STUDY' || map.has(code)) continue;

    const credits = (MN3C_COURSE_CREDITS[cls.courseCode] ??
      MN3C_COURSE_CREDITS[code] ??
      2) as 1 | 2 | 3;

    map.set(code, {
      courseCode: code,
      courseName: cls.courseName,
      creditHours: credits,
      cwaCritical: credits === 3,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );
}

export function mergeRegistryFromSchedule(
  registry: CourseRegistryEntry[],
  schedule: ClassEntry[]
): CourseRegistryEntry[] {
  const map = new Map(registry.map((e) => [normalizeCourseCode(e.courseCode), e]));

  for (const cls of schedule) {
    if (!cls.isDefault || cls.type === 'REST' || cls.type === 'STUDY') continue;
    const code = normalizeCourseCode(cls.courseCode);
    if (map.has(code)) continue;
    const credits = (MN3C_COURSE_CREDITS[code] ?? 2) as 1 | 2 | 3;
    map.set(code, {
      courseCode: code,
      courseName: cls.courseName,
      creditHours: credits,
      cwaCritical: credits === 3,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );
}
