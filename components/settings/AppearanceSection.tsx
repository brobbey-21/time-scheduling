'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_OPTIONS, loadTheme, saveTheme, type AppTheme } from '@/lib/theme';

export default function AppearanceSection() {
  const [appTheme, setAppTheme] = useState<AppTheme>('light');

  useEffect(() => {
    loadTheme().then(setAppTheme);
    const onThemeChange = (e: Event) => {
      setAppTheme((e as CustomEvent<AppTheme>).detail);
    };
    window.addEventListener('theme-changed', onThemeChange);
    return () => window.removeEventListener('theme-changed', onThemeChange);
  }, []);

  return (
    <section className="mb-6">
      <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Appearance</p>
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-2">
          {appTheme === 'dark' ? (
            <Moon size={16} className="text-[var(--text-secondary)]" />
          ) : appTheme === 'system' ? (
            <Monitor size={16} className="text-[var(--text-secondary)]" />
          ) : (
            <Sun size={16} className="text-[var(--text-secondary)]" />
          )}
          <span className="text-body">App Theme</span>
        </div>
        <select
          value={appTheme}
          onChange={async (e) => {
            const theme = e.target.value as AppTheme;
            setAppTheme(theme);
            await saveTheme(theme);
          }}
          className="text-caption bg-transparent text-[var(--text-secondary)] outline-none"
        >
          {THEME_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
