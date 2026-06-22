'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import type { CourseRegistryEntry } from '@/lib/types';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseRegistryEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCourses(data?.courses ?? []);
        setLoaded(true);
      });
  }, []);

  const updateCourse = (index: number, patch: Partial<CourseRegistryEntry>) => {
    setCourses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      if (patch.creditHours !== undefined) {
        next[index].cwaCritical = patch.creditHours === 3;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses }),
      });
      setMessage(res.ok ? 'Saved — planner and AI will use these credits.' : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Admin
      </Link>

      <PageHeader
        title="Course credits"
        subtitle="Credit hours drive study time and CWA priority in the AI planner"
      />

      {!loaded ? (
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--border)]" />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[520px] text-caption">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-base)] text-left">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">CWA</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, index) => (
                <tr key={course.courseCode} className="border-b border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{course.courseCode}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{course.courseName}</td>
                  <td className="px-4 py-3">
                    <select
                      value={course.creditHours}
                      onChange={(e) =>
                        updateCourse(index, {
                          creditHours: parseInt(e.target.value, 10) as 1 | 2 | 3,
                        })
                      }
                      className="rounded-lg border border-[var(--border)] bg-bg-base px-2 py-1"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {course.creditHours === 3 ? (
                      <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro text-accent">
                        High impact
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !loaded}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white disabled:opacity-60 md:max-w-xs"
      >
        <Save size={18} />
        {saving ? 'Saving…' : 'Save credits'}
      </button>

      {message && (
        <p className="text-caption mt-3 text-[var(--text-secondary)]">{message}</p>
      )}
    </main>
  );
}
