'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClassForm, { type ClassFormData } from '@/components/ClassForm';
import { fetchSharedSchedule, saveSharedSchedule } from '@/lib/admin-schedule';
import type { ClassEntry } from '@/lib/types';

export default function AdminEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [cls, setCls] = useState<ClassEntry | null>(null);

  useEffect(() => {
    fetchSharedSchedule().then((classes) => {
      setCls(classes.find((c) => c.id === id) ?? null);
    });
  }, [id]);

  const handleSubmit = async (data: ClassFormData) => {
    const { meetingUrl, ...rest } = data;
    const shared = await fetchSharedSchedule();
    const updated = shared.map((c) =>
      c.id === id
        ? {
            ...c,
            ...rest,
            meetingUrl: meetingUrl.trim() || undefined,
            isDefault: true as const,
            updatedAt: Date.now(),
          }
        : c
    );
    await saveSharedSchedule(updated);
    router.push('/admin/schedule');
  };

  const handleDelete = async () => {
    if (!confirm('Remove this class from the shared schedule for everyone?')) return;
    const shared = await fetchSharedSchedule();
    await saveSharedSchedule(shared.filter((c) => c.id !== id));
    router.push('/admin/schedule');
  };

  if (!cls) {
    return (
      <main className="px-5 pt-8">
        <div className="animate-pulse h-96 rounded-2xl bg-[var(--border)]" />
      </main>
    );
  }

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href="/admin/schedule"
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-display mb-2">Edit Official Class</h1>
      <p className="text-body mb-6 text-[var(--text-secondary)]">
        Updates apply to all MN 3C students.
      </p>
      <ClassForm
        initial={{ ...cls, meetingUrl: cls.meetingUrl ?? '' }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Save for Everyone"
      />
    </main>
  );
}
