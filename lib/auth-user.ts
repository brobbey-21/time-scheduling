import { cookies } from 'next/headers';
import { findUserById, ensureBootstrapAdmins } from './user-storage';
import { SESSION_COOKIE, verifySessionToken } from './auth-session';
import type { SessionUser } from './auth-types';

export async function getFreshSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const jwtUser = await verifySessionToken(token);
  if (!jwtUser) return null;

  await ensureBootstrapAdmins();
  const record = await findUserById(jwtUser.id);
  if (!record) return null;

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    cohort: record.cohort,
  };
}

export async function getJwtSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
