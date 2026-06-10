'use client';

import Link from 'next/link';
import { Calendar, Star, Users, Shield } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const ADMIN_LINKS = [
  {
    href: '/admin/schedule',
    title: 'Class Schedule',
    description: 'Edit the official MN 3C timetable for everyone',
    icon: Calendar,
  },
  {
    href: '/admin/users',
    title: 'Members',
    description: 'See who joined and assign admins',
    icon: Users,
  },
  {
    href: '/admin/ratings',
    title: 'App Ratings',
    description: 'See how students rated Class Time',
    icon: Star,
  },
];

export default function AdminPage() {
  return (
    <main className="px-5 pt-8 pb-8">
      <PageHeader
        title="Admin"
        subtitle="Manage MN 3C Class Time"
        right={
          <div className="rounded-full bg-[var(--accent-light)] p-2.5">
            <Shield size={20} className="text-accent" />
          </div>
        }
      />

      <div className="space-y-3">
        {ADMIN_LINKS.map(({ href, title, description, icon: Icon }) => (
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
