import { getAllClasses, replaceAllClasses } from './db';
import { saveSharedSchedule } from './admin-schedule';
import { notifyClassesChanged, pushPersonalClasses } from './class-sync';
import { notifyScheduleRefresh } from './notifications';
import {
  composeSchedule,
  getPersonalClasses,
  getSharedClasses,
} from './schedule-utils';
import type { ClassEntry } from './types';

export type IcsVisibility = 'public' | 'private';

export async function importIcsSchedule(
  parsed: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[],
  visibility: IcsVisibility
): Promise<void> {
  const now = Date.now();
  const entries: ClassEntry[] = parsed.map((c) => ({
    ...c,
    isDefault: visibility === 'public',
    plannerGenerated: false,
    createdAt: now,
    updatedAt: now,
  }));

  if (visibility === 'public') {
    await saveSharedSchedule(entries);
    return;
  }

  const all = await getAllClasses();
  const shared = getSharedClasses(all);
  const personal = getPersonalClasses(all);
  const plannerKept = personal.filter((c) => c.plannerGenerated);
  const mergedPersonal = [...plannerKept, ...entries];

  await replaceAllClasses(composeSchedule(shared, mergedPersonal));
  await pushPersonalClasses(mergedPersonal);
  notifyClassesChanged();
  notifyScheduleRefresh();
}
