import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isValidCohort } from './cohorts';
import type { Cohort, SessionUser } from './auth-types';

export const SESSION_COOKIE = 'isaac-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is required in production');
    }
    return new TextEncoder().encode('dev-only-auth-secret-change-me');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    cohort: user.cohort,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;
    const cohort = payload.cohort;
    if (
      typeof id !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string' ||
      (role !== 'admin' && role !== 'student') ||
      typeof cohort !== 'string' ||
      !isValidCohort(cohort)
    ) {
      return null;
    }
    return { id, email, name, role, cohort };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export function isAdmin(user: SessionUser | null): user is SessionUser & { role: 'admin' } {
  return user?.role === 'admin';
}
