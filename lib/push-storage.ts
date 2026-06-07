import fs from 'fs/promises';
import path from 'path';
import type { PushStore } from './push-types';
import { EMPTY_PUSH_STORE } from './push-types';

const DATA_FILE = path.join(process.cwd(), '.data', 'push-store.json');
const REDIS_KEY = 'push:store';

async function upstashCommand(command: string[]): Promise<unknown | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(command),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function readRedisStore(): Promise<PushStore | null> {
  const result = (await upstashCommand(['GET', REDIS_KEY])) as {
    result?: string | null;
  } | null;

  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as PushStore;
  } catch {
    return { ...EMPTY_PUSH_STORE };
  }
}

async function writeRedisStore(store: PushStore): Promise<boolean> {
  const result = await upstashCommand(['SET', REDIS_KEY, JSON.stringify(store)]);
  return result !== null;
}

async function readFileStore(): Promise<PushStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as PushStore;
  } catch {
    return { ...EMPTY_PUSH_STORE };
  }
}

async function writeFileStore(store: PushStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export async function getPushStore(): Promise<PushStore> {
  const redisStore = await readRedisStore();
  if (redisStore) return redisStore;
  return readFileStore();
}

export async function savePushStore(store: PushStore): Promise<void> {
  const payload = { ...store, updatedAt: Date.now() };
  const savedToRedis = await writeRedisStore(payload);
  if (!savedToRedis) {
    await writeFileStore(payload);
  }
}

export function isPushStoragePersistent(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
