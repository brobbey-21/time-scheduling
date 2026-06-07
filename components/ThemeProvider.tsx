'use client';

import { useEffect } from 'react';
import { applyTheme, getStoredTheme, loadTheme } from '@/lib/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    loadTheme();

    const onSystemChange = () => {
      const theme = getStoredTheme();
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  return <>{children}</>;
}
