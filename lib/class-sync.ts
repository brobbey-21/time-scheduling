import { getAllClasses, replaceAllClasses } from './db';
import { notifyScheduleRefresh } from './notifications';
import { composeSchedule, getPersonalClasses } from './schedule-utils';
import type { ClassEntry } from './types';

function classTimestamp(cls: ClassEntry): number {
  return cls.updatedAt ?? cls.createdAt;
}

export function mergeClasses(
  local: ClassEntry[],
  remote: ClassEntry[]
): ClassEntry[] {
  const map = new Map<string, ClassEntry>();

  for (const cls of local) {
    map.set(cls.id, cls);
  }

  for (const cls of remote) {
    const existing = map.get(cls.id);
    if (!existing || classTimestamp(cls) >= classTimestamp(existing)) {
      map.set(cls.id, cls);
    }
  }

  return Array.from(map.values());
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulling = false;

export function notifyClassesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('classes-changed'));
}

export async function pushPersonalClasses(classes?: ClassEntry[]): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;

  try {
    const all = classes ?? (await getAllClasses());
    const personal = getPersonalClasses(all);
    const res = await fetch('/api/classes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes: personal }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function scheduleClassPush(): void {
  if (typeof window === 'undefined') return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushPersonalClasses();
  }, 400);
}

export async function syncAllClasses(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine || pulling) return false;

  pulling = true;
  try {
    const [sharedRes, personalRes] = await Promise.all([
      fetch('/api/schedule/shared', { cache: 'no-store' }),
      fetch('/api/classes', { cache: 'no-store' }),
    ]);

    if (sharedRes.status === 401 || personalRes.status === 401) return false;

    let shared: ClassEntry[] = [];
    if (sharedRes.ok) {
      const data = (await sharedRes.json()) as { classes?: ClassEntry[] };
      shared = data.classes ?? [];
    }

    const local = await getAllClasses();
    const localPersonal = getPersonalClasses(local);

    let personal = localPersonal;
    if (personalRes.ok) {
      const data = (await personalRes.json()) as { classes?: ClassEntry[] };
      personal = mergeClasses(localPersonal, data.classes ?? []);
      await pushPersonalClasses(personal);
    }

    if (sharedRes.ok || personalRes.ok) {
      await replaceAllClasses(composeSchedule(shared, personal));
      notifyClassesChanged();
      notifyScheduleRefresh();
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    pulling = false;
  }
}

/** @deprecated Use syncAllClasses */
export async function pullClasses(): Promise<boolean> {
  return syncAllClasses();
}

/** @deprecated Use pushPersonalClasses */
export async function pushClasses(classes?: ClassEntry[]): Promise<boolean> {
  return pushPersonalClasses(classes);
}
