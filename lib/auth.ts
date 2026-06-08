import { compare, hash } from 'bcryptjs';

export {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  createSessionToken,
  getSessionUser,
  sessionCookieOptions,
  verifySessionToken,
} from './auth-session';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return compare(password, passwordHash);
}
