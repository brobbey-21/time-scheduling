'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClassForm, { type ClassFormData } from '@/components/ClassForm';
import { deleteClass, getClassById, updateClass } from '@/lib/db';
import { notifyScheduleRefresh } from '@/lib/notifications';
import type { ClassEntry } from '@/lib/types';

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [cls, setCls] = useState<ClassEntry | null>(null);

  useEffect(() => {
    getClassById(id).then((c) => setCls(c ?? null));
  }, [id]);

  const handleSubmit = async (data: ClassFormData) => {
    await updateClass(id, data);
    notifyScheduleRefresh();
    router.push(`/manage/${id}`);
  };

  const handleDelete = async () => {
    await deleteClass(id);
    router.push('/manage');
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
        href={`/manage/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-display mb-6">Edit Class</h1>
      <ClassForm
        initial={cls}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Save Changes"
      />
    </main>
  );
}
