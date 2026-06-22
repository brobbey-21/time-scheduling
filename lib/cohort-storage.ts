import fs from 'fs/promises';
import path from 'path';
import type { CohortDefinition } from './cohorts';
import { setCustomCohortCache } from './cohorts';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

const REDIS_KEY = 'shared:cohorts';
const DATA_FILE = path.join(process.cwd(), '.data', 'shared', 'cohorts.json');

let cache: CohortDefinition[] | null = null;
let cacheLoaded = false;

async function readRedis(): Promise<CohortDefinition[] | null> {
  const result = (await upstashCommand(['GET', REDIS_KEY])) as {
    result?: string | null;
  } | null;
  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as CohortDefinition[];
  } catch {
    return null;
  }
}

async function writeRedis(entries: CohortDefinition[]): Promise<boolean> {
  const result = await upstashCommand(['SET', REDIS_KEY, JSON.stringify(entries)]);
  return result !== null;
}

async function readFile(): Promise<CohortDefinition[] | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as CohortDefinition[];
  } catch {
    return null;
  }
}

async function writeFile(entries: CohortDefinition[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function normalizeCohort(entry: CohortDefinition): CohortDefinition {
  const id = entry.id.trim();
  return {
    id,
    label: entry.label.trim() || id,
    description: entry.description.trim() || 'UMaT class group',
    hasSeedSchedule: Boolean(entry.hasSeedSchedule),
  };
}

export async function loadCustomCohorts(): Promise<CohortDefinition[]> {
  const fromRedis = await readRedis();
  if (fromRedis) {
    cache = fromRedis.map(normalizeCohort);
    cacheLoaded = true;
    setCustomCohortCache(cache);
    return cache;
  }

  const fromFile = await readFile();
  if (fromFile) {
    cache = fromFile.map(normalizeCohort);
    cacheLoaded = true;
    setCustomCohortCache(cache);
    return cache;
  }

  cache = [];
  cacheLoaded = true;
  setCustomCohortCache(cache);
  return cache;
}

export function getCachedCustomCohorts(): CohortDefinition[] {
  return cache ?? [];
}

export async function ensureCohortCacheLoaded(): Promise<void> {
  if (!cacheLoaded) await loadCustomCohorts();
}

export async function saveCustomCohorts(
  entries: CohortDefinition[]
): Promise<CohortDefinition[]> {
  assertPersistentStorage();
  const normalized = entries.map(normalizeCohort);
  cache = normalized;
  cacheLoaded = true;
  setCustomCohortCache(normalized);

  if (isUpstashConfigured()) {
    const ok = await writeRedis(normalized);
    if (ok) return normalized;
  }
  await writeFile(normalized);
  return normalized;
}

export async function addCustomCohort(
  entry: CohortDefinition,
  existingIds: Set<string>
): Promise<CohortDefinition> {
  const cohort = normalizeCohort(entry);
  if (cohort.id.length < 2 || cohort.id.length > 32) {
    throw new Error('INVALID_COHORT_ID');
  }
  if (!/^[\w\s./-]+$/i.test(cohort.id)) {
    throw new Error('INVALID_COHORT_ID');
  }
  if (existingIds.has(cohort.id)) {
    throw new Error('COHORT_EXISTS');
  }

  const custom = await loadCustomCohorts();
  await saveCustomCohorts([...custom, { ...cohort, hasSeedSchedule: false }]);
  return cohort;
}
