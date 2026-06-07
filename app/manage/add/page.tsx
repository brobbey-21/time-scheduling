'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClassForm, { type ClassFormData } from '@/components/ClassForm';
import { addClass } from '@/lib/db';
import { notifyScheduleRefresh } from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';

export default function AddClassPage() {
  const router = useRouter();

  const handleSubmit = async (data: ClassFormData) => {
    await addClass({
      id: uuidv4(),
      ...data,
      isDefault: false,
    });
    notifyScheduleRefresh();
    router.push('/manage');
  };

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href="/manage"
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-display mb-6">Add Class</h1>
      <ClassForm onSubmit={handleSubmit} />
    </main>
  );
}
