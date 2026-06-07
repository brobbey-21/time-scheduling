import { getSetting, setSetting } from './db';

export type AppTheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'isaac-app-theme';

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'light';
}

export function resolveTheme(theme: AppTheme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

export function applyTheme(theme: AppTheme): 'light' | 'dark' {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);

  const themeColor = resolved === 'dark' ? '#0F172A' : '#F5F5F0';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor);

  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
  return resolved;
}

export async function loadTheme(): Promise<AppTheme> {
  const theme = await getSetting<AppTheme>('appTheme', getStoredTheme());
  applyTheme(theme);
  return theme;
}

export async function saveTheme(theme: AppTheme): Promise<void> {
  localStorage.setItem(STORAGE_KEY, theme);
  await setSetting('appTheme', theme);
  applyTheme(theme);
}

export const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
