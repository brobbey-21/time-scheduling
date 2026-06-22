import fs from 'fs/promises';
import path from 'path';
import { cohortStorageSlug } from './cohorts';
import { dedupeImportedClasses } from './schedule-dedupe';
import type { ClassEntry } from './types';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

function dataFile(cohort: string): string {
  const slug = cohortStorageSlug(cohort);
  return path.join(process.cwd(), '.data', 'shared', `${slug}-schedule.json`);
}

function redisKey(cohort: string): string {
  return `shared:schedule:${cohortStorageSlug(cohort)}`;
}

async function readRedis(key: string): Promise<ClassEntry[] | undefined> {
  const result = (await upstashCommand(['GET', key])) as {
    result?: string | null;
  } | null;
  if (result?.result == null) return undefined;
  try {
    return JSON.parse(result.result) as ClassEntry[];
  } catch {
    return undefined;
  }
}

async function writeRedis(key: string, classes: ClassEntry[]): Promise<boolean> {
  const result = await upstashCommand(['SET', key, JSON.stringify(classes)]);
  return result !== null;
}

async function readFile(file: string): Promise<ClassEntry[] | undefined> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as ClassEntry[];
  } catch {
    return undefined;
  }
}

async function writeFile(file: string, classes: ClassEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(classes, null, 2), 'utf8');
}

async function readStoredSchedule(cohort: string): Promise<ClassEntry[] | undefined> {
  const key = redisKey(cohort);
  const file = dataFile(cohort);

  if (isUpstashConfigured()) {
    const redis = await readRedis(key);
    if (redis !== undefined) return redis;
  }

  return readFile(file);
}

export async function getSharedSchedule(cohort: string): Promise<ClassEntry[]> {
  const stored = await readStoredSchedule(cohort);
  if (stored === undefined) return [];

  const deduped = dedupeImportedClasses(stored);
  if (deduped.length !== stored.length) {
    await saveSharedSchedule(cohort, deduped);
  }
  return deduped;
}

export async function saveSharedSchedule(
  cohort: string,
  classes: ClassEntry[]
): Promise<boolean> {
  assertPersistentStorage();
  const payload = dedupeImportedClasses(classes.map((c) => ({ ...c, isDefault: true })));
  const key = redisKey(cohort);
  const file = dataFile(cohort);

  if (isUpstashConfigured()) {
    const ok = await writeRedis(key, payload);
    if (ok) return true;
  }
  await writeFile(file, payload);
  return true;
}
