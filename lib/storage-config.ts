import { isUpstashConfigured } from './upstash';

export function isPersistentStorageAvailable(): boolean {
  if (isUpstashConfigured()) return true;
  return process.env.NODE_ENV !== 'production';
}

export function assertPersistentStorage(): void {
  if (isPersistentStorageAvailable()) return;
  throw new Error('STORAGE_NOT_CONFIGURED');
}

export const STORAGE_SETUP_MESSAGE =
  'Server storage is not set up. In Vercel: Storage → Create Upstash Redis → connect to project → redeploy.';
