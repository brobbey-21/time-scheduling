import type { UserRole } from './auth-types';

/** Primary platform owner — always kept as admin. */
export const PRIMARY_OWNER_EMAIL = 'mn-oiseibrobbey6423@gmail.com';

export function getBootstrapAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([PRIMARY_OWNER_EMAIL, ...fromEnv]));
}

export function isPrimaryOwner(email: string): boolean {
  return email.trim().toLowerCase() === PRIMARY_OWNER_EMAIL;
}

export function resolveUserRole(email: string): UserRole {
  return getBootstrapAdminEmails().includes(email.trim().toLowerCase())
    ? 'admin'
    : 'student';
}
