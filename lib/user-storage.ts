import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { assertPersistentStorage } from './storage-config';
import { isUpstashConfigured, upstashCommand } from './upstash';
import { getBootstrapAdminEmails, isPrimaryOwner, resolveUserRole } from './admin-users';
import type { Cohort, UserRecord, UserRole } from './auth-types';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cohort: Cohort;
  createdAt: number;
}

export { resolveUserRole } from './admin-users';

const DATA_FILE = path.join(process.cwd(), '.data', 'users.json');
const REDIS_KEY = 'auth:users';

interface UserStore {
  users: UserRecord[];
  updatedAt: number;
}

function normalizeLegacyUser(user: UserRecord & { role?: UserRole; cohort?: Cohort }): UserRecord {
  return {
    ...user,
    role: user.role ?? 'student',
    cohort: user.cohort ?? 'MN 3C',
  };
}

async function readRedisStore(): Promise<UserStore | null> {
  const result = (await upstashCommand(['GET', REDIS_KEY])) as {
    result?: string | null;
  } | null;

  if (!result?.result) return null;
  try {
    const parsed = JSON.parse(result.result) as UserStore;
    return { ...parsed, users: parsed.users.map(normalizeLegacyUser) };
  } catch {
    return { users: [], updatedAt: 0 };
  }
}

async function writeRedisStore(store: UserStore): Promise<boolean> {
  const result = await upstashCommand(['SET', REDIS_KEY, JSON.stringify(store)]);
  return result !== null;
}

async function readFileStore(): Promise<UserStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as UserStore;
    return { ...parsed, users: parsed.users.map(normalizeLegacyUser) };
  } catch {
    return { users: [], updatedAt: 0 };
  }
}

async function writeFileStore(store: UserStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function getStore(): Promise<UserStore> {
  const redisStore = await readRedisStore();
  if (redisStore) return redisStore;
  return readFileStore();
}

async function saveStore(store: UserStore): Promise<void> {
  assertPersistentStorage();
  const payload = { ...store, updatedAt: Date.now() };
  const savedToRedis = await writeRedisStore(payload);
  if (!savedToRedis) {
    await writeFileStore(payload);
  }
}

export async function ensureBootstrapAdmins(): Promise<void> {
  const adminEmails = getBootstrapAdminEmails();
  const store = await getStore();
  let changed = false;

  for (const user of store.users) {
    if (adminEmails.includes(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }
  }

  if (changed) await saveStore(store);
}

export async function listPublicUsers(cohortFilter?: string): Promise<PublicUser[]> {
  await ensureBootstrapAdmins();
  const store = await getStore();
  return store.users
    .filter((u) => !cohortFilter || u.cohort === cohortFilter)
    .map(({ id, email, name, role, cohort, createdAt }) => ({
      id,
      email,
      name,
      role,
      cohort,
      createdAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function countAdminsInCohort(cohort: string): Promise<number> {
  const store = await getStore();
  return store.users.filter((u) => u.role === 'admin' && u.cohort === cohort).length;
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  actor?: { cohort: string; email: string; isSuperAdmin: boolean }
): Promise<PublicUser> {
  const store = await getStore();
  const index = store.users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('USER_NOT_FOUND');

  const target = store.users[index];

  if (actor && !actor.isSuperAdmin && actor.cohort !== target.cohort) {
    throw new Error('COHORT_FORBIDDEN');
  }

  if (role === 'student' && isPrimaryOwner(target.email)) {
    throw new Error('CANNOT_DEMOTE_OWNER');
  }

  if (role === 'student' && target.role === 'admin') {
    const cohortAdmins = store.users.filter(
      (u) => u.role === 'admin' && u.cohort === target.cohort
    ).length;
    if (cohortAdmins <= 1) throw new Error('LAST_COHORT_ADMIN');
  }

  store.users[index] = { ...target, role };
  await saveStore(store);

  const { id, email, name, cohort, createdAt } = store.users[index];
  return { id, email, name, role, cohort, createdAt };
}

export async function findUserByEmail(
  email: string
): Promise<UserRecord | undefined> {
  const store = await getStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email === normalized);
}

export async function findUserById(
  id: string
): Promise<UserRecord | undefined> {
  const store = await getStore();
  return store.users.find((u) => u.id === id);
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
  cohort: Cohort
): Promise<UserRecord> {
  const store = await getStore();
  const normalized = email.trim().toLowerCase();
  if (store.users.some((u) => u.email === normalized)) {
    throw new Error('EMAIL_TAKEN');
  }

  const user: UserRecord = {
    id: uuidv4(),
    email: normalized,
    name: name.trim(),
    passwordHash,
    role: resolveUserRole(normalized),
    cohort,
    createdAt: Date.now(),
  };

  store.users.push(user);
  await saveStore(store);
  return user;
}
