import fs from 'fs/promises';
import path from 'path';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

export interface AppRating {
  userId: string;
  userName: string;
  userEmail: string;
  stars: number;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

interface RatingStore {
  ratings: AppRating[];
  updatedAt: number;
}

const DATA_FILE = path.join(process.cwd(), '.data', 'ratings.json');
const REDIS_KEY = 'app:ratings';

async function readRedis(): Promise<RatingStore | null> {
  const result = (await upstashCommand(['GET', REDIS_KEY])) as {
    result?: string | null;
  } | null;
  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as RatingStore;
  } catch {
    return { ratings: [], updatedAt: 0 };
  }
}

async function writeRedis(store: RatingStore): Promise<boolean> {
  const result = await upstashCommand(['SET', REDIS_KEY, JSON.stringify(store)]);
  return result !== null;
}

async function readFile(): Promise<RatingStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as RatingStore;
  } catch {
    return { ratings: [], updatedAt: 0 };
  }
}

async function writeFile(store: RatingStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function getStore(): Promise<RatingStore> {
  const redis = await readRedis();
  if (redis) return redis;
  return readFile();
}

async function saveStore(store: RatingStore): Promise<void> {
  assertPersistentStorage();
  const payload = { ...store, updatedAt: Date.now() };
  const ok = await writeRedis(payload);
  if (!ok) await writeFile(payload);
}

export async function getUserRating(userId: string): Promise<AppRating | null> {
  const store = await getStore();
  return store.ratings.find((r) => r.userId === userId) ?? null;
}

export async function saveUserRating(
  rating: Omit<AppRating, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): Promise<AppRating> {
  const store = await getStore();
  const now = Date.now();
  const existing = store.ratings.find((r) => r.userId === rating.userId);
  const entry: AppRating = {
    ...rating,
    stars: Math.min(5, Math.max(1, Math.round(rating.stars))),
    comment: rating.comment?.trim() || undefined,
    createdAt: existing?.createdAt ?? rating.createdAt ?? now,
    updatedAt: now,
  };

  store.ratings = [
    entry,
    ...store.ratings.filter((r) => r.userId !== rating.userId),
  ];
  await saveStore(store);
  return entry;
}

export async function listAllRatings(): Promise<AppRating[]> {
  const store = await getStore();
  return [...store.ratings].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function ratingSummary(ratings: AppRating[]): {
  count: number;
  average: number;
  distribution: Record<number, number>;
} {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (ratings.length === 0) {
    return { count: 0, average: 0, distribution };
  }
  let sum = 0;
  for (const r of ratings) {
    sum += r.stars;
    distribution[r.stars] = (distribution[r.stars] ?? 0) + 1;
  }
  return {
    count: ratings.length,
    average: Math.round((sum / ratings.length) * 10) / 10,
    distribution,
  };
}
