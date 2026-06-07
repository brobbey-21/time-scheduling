'use client';

import { useEffect } from 'react';
import { seedIfNeeded } from '@/lib/seed';
import { notifyScheduleRefresh } from '@/lib/notifications';
import { pullTodos } from '@/lib/todo-sync';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedIfNeeded().then(() => {
      notifyScheduleRefresh();
      void pullTodos();
    });

    const sync = () => void pullTodos();
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return <>{children}</>;
}
