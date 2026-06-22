'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClassForm, { type ClassFormData } from '@/components/ClassForm';
import { upsertCourseInRegistry } from '@/lib/admin-course-registry';
import { fetchSharedSchedule, saveSharedSchedule } from '@/lib/admin-schedule';
import { normalizeCourseCode } from '@/lib/course-catalog';
import type { CourseRegistryEntry } from '@/lib/types';

export default function AdminEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [initialForm, setInitialForm] = useState<Partial<ClassFormData> | null>(null);

  useEffect(() => {
    Promise.all([
      fetchSharedSchedule(),
      fetch('/api/admin/courses').then((res) => (res.ok ? res.json() : null)),
    ]).then(([classes, registryData]) => {
      const found = classes.find((c) => c.id === id);
      if (!found) {
        setInitialForm(null);
        return;
      }
      const courses = (registryData?.courses ?? []) as CourseRegistryEntry[];
      const code = normalizeCourseCode(found.courseCode);
      const match = courses.find((c) => normalizeCourseCode(c.courseCode) === code);
      setInitialForm({
        ...found,
        meetingUrl: found.meetingUrl ?? '',
        creditHours: match?.creditHours ?? 2,
      });
    });
  }, [id]);

  const handleSubmit = async (data: ClassFormData) => {
    const { meetingUrl, creditHours: credits, ...rest } = data;
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
    if (data.type !== 'REST' && data.type !== 'STUDY') {
      await upsertCourseInRegistry({
        courseCode: data.courseCode,
        courseName: data.courseName,
        creditHours: credits,
      });
    }
    router.push('/admin/schedule');
  };

  const handleDelete = async () => {
    if (!confirm('Remove this class from the shared schedule for everyone?')) return;
    const shared = await fetchSharedSchedule();
    await saveSharedSchedule(shared.filter((c) => c.id !== id));
    router.push('/admin/schedule');
  };

  if (!initialForm) {
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
        Updates apply to everyone in your class.
      </p>
      <ClassForm
        initial={initialForm}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Save for Everyone"
        showCreditHours
      />
    </main>
  );
}
