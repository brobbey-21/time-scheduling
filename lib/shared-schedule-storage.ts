import fs from 'fs/promises';
import path from 'path';
import { cohortHasSeedSchedule, cohortStorageSlug } from './cohorts';
import type { ClassEntry } from './types';
import { OFFICIAL_CLASSES } from './timetable.config';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

const LEGACY_MN3C_SLUG = 'mn3c';

function dataFile(cohort: string): string {
  const slug = cohortStorageSlug(cohort);
  return path.join(process.cwd(), '.data', 'shared', `${slug}-schedule.json`);
}

function redisKey(cohort: string): string {
  return `shared:schedule:${cohortStorageSlug(cohort)}`;
}

function legacyRedisKey(): string {
  return `shared:schedule:${LEGACY_MN3C_SLUG}`;
}

function legacyDataFile(): string {
  return path.join(process.cwd(), '.data', 'shared', `${LEGACY_MN3C_SLUG}-schedule.json`);
}

async function readRedis(key: string): Promise<ClassEntry[] | null> {
  const result = (await upstashCommand(['GET', key])) as {
    result?: string | null;
  } | null;
  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as ClassEntry[];
  } catch {
    return null;
  }
}

async function writeRedis(key: string, classes: ClassEntry[]): Promise<boolean> {
  const result = await upstashCommand(['SET', key, JSON.stringify(classes)]);
  return result !== null;
}

async function readFile(file: string): Promise<ClassEntry[] | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as ClassEntry[];
  } catch {
    return null;
  }
}

async function writeFile(file: string, classes: ClassEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(classes, null, 2), 'utf8');
}

function seedOfficialClasses(): ClassEntry[] {
  const now = Date.now();
  return OFFICIAL_CLASSES.map((c) => ({
    ...c,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }));
}

async function readStoredSchedule(cohort: string): Promise<ClassEntry[] | null> {
  const key = redisKey(cohort);
  const file = dataFile(cohort);

  const redis = await readRedis(key);
  if (redis && redis.length > 0) return redis;

  const fromFile = await readFile(file);
  if (fromFile && fromFile.length > 0) return fromFile;

  if (cohort === 'MN 3C') {
    const legacyRedis = await readRedis(legacyRedisKey());
    if (legacyRedis && legacyRedis.length > 0) return legacyRedis;

    const legacyFile = await readFile(legacyDataFile());
    if (legacyFile && legacyFile.length > 0) return legacyFile;
  }

  return null;
}

export async function getSharedSchedule(cohort: string): Promise<ClassEntry[]> {
  const stored = await readStoredSchedule(cohort);
  if (stored && stored.length > 0) return stored;

  if (cohortHasSeedSchedule(cohort)) {
    const seeded = seedOfficialClasses();
    await saveSharedSchedule(cohort, seeded);
    return seeded;
  }

  return [];
}

export async function saveSharedSchedule(
  cohort: string,
  classes: ClassEntry[]
): Promise<boolean> {
  assertPersistentStorage();
  const payload = classes.map((c) => ({ ...c, isDefault: true }));
  const key = redisKey(cohort);
  const file = dataFile(cohort);

  if (isUpstashConfigured()) {
    const ok = await writeRedis(key, payload);
    if (ok) return true;
  }
  await writeFile(file, payload);
  return true;
}
