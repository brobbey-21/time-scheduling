import fs from 'fs/promises';
import path from 'path';
import type { ClassEntry } from './types';
import { OFFICIAL_CLASSES } from './timetable.config';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

const DATA_FILE = path.join(process.cwd(), '.data', 'shared', 'mn3c-schedule.json');
const REDIS_KEY = 'shared:schedule:mn3c';

async function readRedis(): Promise<ClassEntry[] | null> {
  const result = (await upstashCommand(['GET', REDIS_KEY])) as {
    result?: string | null;
  } | null;
  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as ClassEntry[];
  } catch {
    return null;
  }
}

async function writeRedis(classes: ClassEntry[]): Promise<boolean> {
  const result = await upstashCommand(['SET', REDIS_KEY, JSON.stringify(classes)]);
  return result !== null;
}

async function readFile(): Promise<ClassEntry[] | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as ClassEntry[];
  } catch {
    return null;
  }
}

async function writeFile(classes: ClassEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(classes, null, 2), 'utf8');
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

export async function getSharedSchedule(): Promise<ClassEntry[]> {
  const redis = await readRedis();
  if (redis && redis.length > 0) return redis;

  const file = await readFile();
  if (file && file.length > 0) return file;

  const seeded = seedOfficialClasses();
  await saveSharedSchedule(seeded);
  return seeded;
}

export async function saveSharedSchedule(classes: ClassEntry[]): Promise<boolean> {
  assertPersistentStorage();
  const payload = classes.map((c) => ({ ...c, isDefault: true }));
  if (isUpstashConfigured()) {
    const ok = await writeRedis(payload);
    if (ok) return true;
  }
  await writeFile(payload);
  return true;
}
