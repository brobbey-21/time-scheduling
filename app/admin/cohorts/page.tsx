'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Plus, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import type { CohortDefinition } from '@/lib/cohorts';

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<CohortDefinition[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/admin/cohorts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCohorts(data?.cohorts ?? []);
        setLoaded(true);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const customCohorts = useMemo(
    () =>
      cohorts.filter(
        (c) =>
          !c.hasSeedSchedule &&
          !['MN 2A', 'MN 2B', 'MN 4A', 'CS 3A', 'EE 3A'].includes(c.id)
      ),
    [cohorts]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/admin/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          label: id.trim(),
          description: description.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not create class group.');
        return;
      }
      setMessage(data.message ?? 'Class group created.');
      setId('');
      setDescription('');
      load();
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
        title="Class groups"
        subtitle="Create a group so other classes can sign up and get their own timetable"
        right={
          <div className="rounded-full bg-[var(--accent-light)] p-2.5">
            <Users size={20} className="text-accent" />
          </div>
        }
      />

      <div className="card mb-5 space-y-4">
        <p className="text-caption text-[var(--text-secondary)]">
          New students pick their class on the sign-up page. After creating a group, open{' '}
          <strong>Class Schedule</strong> to add their official timetable (or promote a classmate
          as admin for that group).
        </p>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
              Class code
            </label>
            <input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="EE 3B"
              className="w-full rounded-xl border border-[var(--border)] bg-bg-base px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Electrical Engineering — Year 3"
              className="w-full rounded-xl border border-[var(--border)] bg-bg-base px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !id.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white disabled:opacity-60"
          >
            <Plus size={18} />
            {saving ? 'Creating…' : 'Create class group'}
          </button>
        </form>

        {message && <p className="text-caption text-[var(--text-secondary)]">{message}</p>}
        {error && <p className="text-caption text-[var(--danger-text)]">{error}</p>}
      </div>

      {!loaded ? (
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--border)]" />
      ) : (
        <div className="card p-0">
          <p className="border-b border-[var(--border)] px-4 py-3 text-micro uppercase text-[var(--text-tertiary)]">
            Available on sign-up ({cohorts.length})
          </p>
          <ul className="divide-y divide-[var(--border)]">
            {cohorts.map((cohort) => (
              <li key={cohort.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-light)]">
                  <GraduationCap size={16} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-body font-medium">{cohort.label}</p>
                  <p className="text-caption text-[var(--text-secondary)]">{cohort.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {customCohorts.length > 0 && (
        <p className="text-caption mt-4 text-[var(--text-tertiary)]">
          {customCohorts.length} admin-created group(s) on the list above.
        </p>
      )}
    </main>
  );
}
