import { syncAllClasses } from './class-sync';
import type { ClassEntry } from './types';

export async function fetchSharedSchedule(): Promise<ClassEntry[]> {
  const res = await fetch('/api/schedule/shared', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load schedule');
  const data = (await res.json()) as { classes?: ClassEntry[] };
  return data.classes ?? [];
}

export async function saveSharedSchedule(
  classes: ClassEntry[],
  options?: { replaceRegistry?: boolean }
): Promise<void> {
  const res = await fetch('/api/schedule/shared', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      classes,
      replaceRegistry: options?.replaceRegistry === true,
    }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? 'Failed to save schedule');
  }
  await syncAllClasses();
}

export async function clearSharedSchedule(): Promise<void> {
  const sharedRes = await fetch('/api/schedule/shared', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classes: [], replaceRegistry: true }),
  });
  if (!sharedRes.ok) {
    const data = (await sharedRes.json()) as { error?: string };
    throw new Error(data.error ?? 'Failed to clear shared schedule');
  }

  const personalRes = await fetch('/api/classes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classes: [] }),
  });
  if (!personalRes.ok) {
    const data = (await personalRes.json()) as { error?: string };
    throw new Error(data.error ?? 'Failed to clear personal routines');
  }

  await syncAllClasses();
}
