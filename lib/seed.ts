import { getSetting, setSetting } from './db';

export async function seedIfNeeded(): Promise<void> {
  const initialized = await getSetting<boolean>('appInitialized', false);
  if (initialized) return;

  await setSetting('notificationsEnabled', true);
  await setSetting('defaultReminderMins', 10);
  await setSetting('defaultTaskReminderTime', '18:00');
  await setSetting('endOfDayReminderEnabled', true);
  await setSetting('endOfDayReminderTime', '21:00');
  await setSetting('appInitialized', true);
}
