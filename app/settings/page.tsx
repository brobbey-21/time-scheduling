'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import AppRatingCard from '@/components/AppRatingCard';
import PageHeader from '@/components/PageHeader';
import AccountSection from '@/components/settings/AccountSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import StudyPlannerSection from '@/components/settings/StudyPlannerSection';
import AppearanceSection from '@/components/settings/AppearanceSection';
import DataSection from '@/components/settings/DataSection';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  cohort: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }, [router]);

  return (
    <main className="px-5 pt-8 pb-8">
      <PageHeader title="Settings" />

      {user && <AccountSection user={user} onLogout={handleLogout} />}

      <NotificationsSection />

      <StudyPlannerSection />

      <AppearanceSection />

      <DataSection />

      {user && (
        <section className="mb-6">
          <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Feedback</p>
          <AppRatingCard userName={user.name} />
        </section>
      )}

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">About</p>
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-[var(--text-secondary)]" />
              <span className="text-body">App Version</span>
            </div>
            <span className="text-caption text-[var(--text-tertiary)]">1.0.0</span>
          </div>
          <p className="text-caption text-[var(--text-secondary)]">
            {user?.cohort ?? 'UMaT'} · Semester 2, 2026
          </p>
        </div>
      </section>

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">iOS Tip</p>
        <div className="card flex gap-3">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-caption text-[var(--text-secondary)]">
            On iPhone, tap Share → Add to Home Screen, then open the app and allow
            notifications. Class, task, and end-of-day reminders sync for the next 7 days.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Offline</p>
        <div className="card flex gap-3">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-caption text-[var(--text-secondary)]">
            Open the app once while online to cache it. Your timetable and todos
            sync to your account across phone and computer when you sign in.
          </p>
        </div>
      </section>
    </main>
  );
}
