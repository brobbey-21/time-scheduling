'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { syncAllClasses } from '@/lib/class-sync';
import {
  creditsMapFromRegistry,
  fetchCourseRegistry,
} from '@/lib/course-registry-client';
import { normalizeCourseCode, setCourseCreditOverrides } from '@/lib/course-catalog';
import { seedIfNeeded } from '@/lib/seed';
import { notifyScheduleRefresh } from '@/lib/notifications';
import { pullTodos } from '@/lib/todo-sync';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === '/login' || pathname === '/offline';

  useEffect(() => {
    if (isPublic) return;

    const init = async () => {
      await Promise.all([syncAllClasses(), pullTodos()]);
      const entries = await fetchCourseRegistry();
      const raw = creditsMapFromRegistry(entries);
      const map: Record<string, 1 | 2 | 3> = {};
      for (const [code, credits] of Object.entries(raw)) {
        map[normalizeCourseCode(code)] = credits;
      }
      setCourseCreditOverrides(map);
      await seedIfNeeded();
      notifyScheduleRefresh();
    };

    void init();

    const sync = async () => {
      await Promise.all([syncAllClasses(), pullTodos()]);
      notifyScheduleRefresh();
    };
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
    };
  }, [isPublic]);

  return <>{children}</>;
}
