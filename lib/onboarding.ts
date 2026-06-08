const STORAGE_PREFIX = 'class-time-tutorial-done';

export function tutorialStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function hasSeenTutorial(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(tutorialStorageKey(userId)) === '1';
  } catch {
    return true;
  }
}

export function markTutorialSeen(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(tutorialStorageKey(userId), '1');
  } catch {
    /* ignore */
  }
}
