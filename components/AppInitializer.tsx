'use client';

import { useEffect } from 'react';
import { seedIfNeeded } from '@/lib/seed';
import { notifyScheduleRefresh } from '@/lib/notifications';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedIfNeeded().then(() => notifyScheduleRefresh());
  }, []);

  return <>{children}</>;
}
