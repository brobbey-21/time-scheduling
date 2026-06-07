import { bulkPutClasses, getSetting, setSetting } from './db';
import { DEFAULT_CLASSES } from './timetable.config';

export async function seedIfNeeded(): Promise<void> {
  const seeded = await getSetting<boolean>('seeded', false);
  if (seeded) return;

  await bulkPutClasses(DEFAULT_CLASSES);
  await setSetting('seeded', true);
  await setSetting('notificationsEnabled', true);
  await setSetting('defaultReminderMins', 10);
}
