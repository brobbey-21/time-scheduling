import fs from 'fs/promises';
import path from 'path';
import type { ClassEntry, TodoEntry } from './types';
import type { UserMeta } from './auth-types';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';

const DATA_DIR = path.join(process.cwd(), '.data', 'users');

function todosKey(userId: string) {
  return `user:${userId}:todos`;
}

function classesKey(userId: string) {
  return `user:${userId}:classes`;
}

function metaKey(userId: string) {
  return `user:${userId}:meta`;
}

function filePath(userId: string, kind: 'todos' | 'classes' | 'meta') {
  return path.join(DATA_DIR, userId, `${kind}.json`);
}

async function readRedis<T>(key: string): Promise<T | null> {
  const result = (await upstashCommand(['GET', key])) as {
    result?: string | null;
  } | null;
  if (!result?.result) return null;
  try {
    return JSON.parse(result.result) as T;
  } catch {
    return null;
  }
}

async function writeRedis(key: string, value: unknown): Promise<boolean> {
  const result = await upstashCommand(['SET', key, JSON.stringify(value)]);
  return result !== null;
}

async function readFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeFile(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

async function getValue<T>(redisKey: string, file: string): Promise<T | null> {
  if (isUpstashConfigured()) {
    const redis = await readRedis<T>(redisKey);
    if (redis !== null) return redis;
  }
  return readFile<T>(file);
}

async function setValue(
  redisKey: string,
  file: string,
  value: unknown
): Promise<boolean> {
  assertPersistentStorage();
  if (isUpstashConfigured()) {
    const ok = await writeRedis(redisKey, value);
    if (ok) return true;
  }
  await writeFile(file, value);
  return true;
}

export async function getUserTodos(userId: string): Promise<TodoEntry[]> {
  const data = await getValue<TodoEntry[]>(todosKey(userId), filePath(userId, 'todos'));
  return data ?? [];
}

export async function saveUserTodos(
  userId: string,
  todos: TodoEntry[]
): Promise<boolean> {
  return setValue(todosKey(userId), filePath(userId, 'todos'), todos);
}

export async function getUserClasses(userId: string): Promise<ClassEntry[]> {
  const data = await getValue<ClassEntry[]>(
    classesKey(userId),
    filePath(userId, 'classes')
  );
  return data ?? [];
}

export async function saveUserClasses(
  userId: string,
  classes: ClassEntry[]
): Promise<boolean> {
  return setValue(classesKey(userId), filePath(userId, 'classes'), classes);
}

export async function getUserMeta(userId: string): Promise<UserMeta | null> {
  return getValue<UserMeta>(metaKey(userId), filePath(userId, 'meta'));
}

export async function saveUserMeta(
  userId: string,
  meta: UserMeta
): Promise<boolean> {
  return setValue(metaKey(userId), filePath(userId, 'meta'), meta);
}
