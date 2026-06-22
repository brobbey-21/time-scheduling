import { isPrimaryOwner, getBootstrapAdminEmails } from './admin-users';
import type { SessionUser } from './auth-types';

export function isSuperAdmin(user: SessionUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  return (
    isPrimaryOwner(user.email) ||
    getBootstrapAdminEmails().includes(user.email.trim().toLowerCase())
  );
}

export function canManageCohortSchedule(
  user: SessionUser | null,
  cohort: string
): boolean {
  if (!user || user.role !== 'admin') return false;
  if (isSuperAdmin(user)) return true;
  return user.cohort === cohort;
}

export function canManageUser(
  actor: SessionUser | null,
  target: { cohort: string; email: string }
): boolean {
  if (!actor || actor.role !== 'admin') return false;
  if (isSuperAdmin(actor)) return true;
  return actor.cohort === target.cohort;
}
