'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, GraduationCap, Star, Users, Shield } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function AdminPage() {
  const [cohort, setCohort] = useState('your class');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.cohort) setCohort(data.user.cohort);
      });
  }, []);

  const links = [
    {
      href: '/admin/schedule',
      title: 'Class Schedule',
      description: `Edit the official ${cohort} timetable for your class`,
      icon: Calendar,
    },
    {
      href: '/admin/schedule/grid',
      title: 'Week Grid (Desktop)',
      description: 'Visual timetable editor for PC',
      icon: Calendar,
    },
    {
      href: '/admin/courses',
      title: 'Course Credits',
      description: 'Set 1/2/3 credit hours — drives AI study priority',
      icon: GraduationCap,
    },
    {
      href: '/admin/users',
      title: 'Members',
      description: 'See who joined and assign class admins',
      icon: Users,
    },
    {
      href: '/admin/ratings',
      title: 'App Ratings',
      description: 'See how students rated Class Time',
      icon: Star,
    },
  ];

  return (
    <main className="px-5 pt-8 pb-8">
      <PageHeader
        title="Admin"
        subtitle={`Manage ${cohort} on Class Time`}
        right={
          <div className="rounded-full bg-[var(--accent-light)] p-2.5">
            <Shield size={20} className="text-accent" />
          </div>
        }
      />

      <p className="text-caption mb-5 text-[var(--text-secondary)]">
        Promote a trusted classmate to admin so they can help populate the shared
        timetable. Each class has its own schedule — other groups never see yours.
      </p>

      <div className="space-y-3">
        {links.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-4 transition-transform active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-light)]">
              <Icon size={22} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-subtitle">{title}</p>
              <p className="text-caption text-[var(--text-secondary)]">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
