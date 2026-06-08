import { getSetting, setSetting } from './db';

export async function seedIfNeeded(): Promise<void> {
  const initialized = await getSetting<boolean>('appInitialized', false);
  if (initialized) return;

  await setSetting('notificationsEnabled', true);
  await setSetting('defaultReminderMins', 10);
  await setSetting('appInitialized', true);
}
