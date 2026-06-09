import fs from 'fs/promises';
import path from 'path';
import { isUpstashConfigured, upstashCommand } from './upstash';
import type { PushStore } from './push-types';
import { EMPTY_PUSH_STORE } from './push-types';

const DATA_DIR = path.join(process.cwd(), '.data', 'push');
const USERS_INDEX_FILE = path.join(DATA_DIR, 'users.json');
const USERS_REDIS_KEY = 'push:users';

function storeKey(userId: string) {
  return `push:store:${userId}`;
}

function filePath(userId: string) {
  return path.join(DATA_DIR, `${userId}.json`);
}

async function readRedisStore(userId: string): Promise<PushStore | null> {
  const result = (await upstashCommand(['GET', storeKey(userId)])) as {
    result?: string | null;
  } | null;

  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as PushStore;
  } catch {
    return { ...EMPTY_PUSH_STORE };
  }
}

async function writeRedisStore(userId: string, store: PushStore): Promise<boolean> {
  const result = await upstashCommand([
    'SET',
    storeKey(userId),
    JSON.stringify(store),
  ]);
  if (result === null) return false;
  await upstashCommand(['SADD', USERS_REDIS_KEY, userId]);
  return true;
}

async function readFileStore(userId: string): Promise<PushStore> {
  try {
    const raw = await fs.readFile(filePath(userId), 'utf8');
    return JSON.parse(raw) as PushStore;
  } catch {
    return { ...EMPTY_PUSH_STORE };
  }
}

async function writeFileStore(userId: string, store: PushStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath(userId), JSON.stringify(store, null, 2), 'utf8');

  let users: string[] = [];
  try {
    const raw = await fs.readFile(USERS_INDEX_FILE, 'utf8');
    users = JSON.parse(raw) as string[];
  } catch {
    users = [];
  }
  if (!users.includes(userId)) {
    users.push(userId);
    await fs.writeFile(USERS_INDEX_FILE, JSON.stringify(users, null, 2), 'utf8');
  }
}

export async function getUserPushStore(userId: string): Promise<PushStore> {
  const redisStore = await readRedisStore(userId);
  if (redisStore) return redisStore;
  return readFileStore(userId);
}

export async function saveUserPushStore(
  userId: string,
  store: PushStore
): Promise<void> {
  const payload = { ...store, updatedAt: Date.now() };
  const savedToRedis = await writeRedisStore(userId, payload);
  if (!savedToRedis) {
    await writeFileStore(userId, payload);
  }
}

export async function listPushUserIds(): Promise<string[]> {
  if (isUpstashConfigured()) {
    const result = (await upstashCommand(['SMEMBERS', USERS_REDIS_KEY])) as {
      result?: string[];
    } | null;
    return result?.result ?? [];
  }

  try {
    const raw = await fs.readFile(USERS_INDEX_FILE, 'utf8');
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function removeUserPushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const store = await getUserPushStore(userId);
  store.subscriptions = store.subscriptions.filter((s) => s.endpoint !== endpoint);
  await saveUserPushStore(userId, store);
}

/** @deprecated Use getUserPushStore */
export async function getPushStore(): Promise<PushStore> {
  return { ...EMPTY_PUSH_STORE };
}

/** @deprecated Use saveUserPushStore */
export async function savePushStore(store: PushStore): Promise<void> {
  void store;
}

export function isPushStoragePersistent(): boolean {
  return isUpstashConfigured();
}
