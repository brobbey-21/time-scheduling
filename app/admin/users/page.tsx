'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Shield, ShieldOff, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { PRIMARY_OWNER_EMAIL } from '@/lib/admin-users';

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  cohort: string;
  createdAt: number;
}

interface CohortOption {
  id: string;
  label: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [cohortLabel, setCohortLabel] = useState('your class');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [migratingId, setMigratingId] = useState<string | null>(null);
  const [targetCohort, setTargetCohort] = useState<Record<string, string>>({});
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [usersRes, cohortsRes] = await Promise.all([
        fetch('/api/admin/users', { cache: 'no-store' }),
        fetch('/api/cohorts', { cache: 'no-store' }),
      ]);

      if (!usersRes.ok) {
        const data = (await usersRes.json()) as { error?: string };
        setError(data.error ?? 'Failed to load users');
        return;
      }
      const data = (await usersRes.json()) as {
        users: PublicUser[];
        total: number;
        admins: number;
        cohort?: string;
        isSuperAdmin?: boolean;
      };
      setUsers(data.users);
      setTotal(data.total);
      setAdminCount(data.admins);
      if (data.cohort) setCohortLabel(data.cohort);
      setIsSuperAdmin(Boolean(data.isSuperAdmin));

      if (cohortsRes.ok) {
        const cData = (await cohortsRes.json()) as { cohorts: CohortOption[] };
        setCohorts(cData.cohorts ?? []);
      }
    } catch {
      setError('Network error loading users.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRole = async (user: PublicUser) => {
    const nextRole = user.role === 'admin' ? 'student' : 'admin';
    const label = nextRole === 'admin' ? 'make an admin' : 'remove admin from';
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${user.name}?`)) {
      return;
    }

    setUpdatingId(user.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to update role');
        return;
      }
      await load();
    } catch {
      setError('Network error updating role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const migrateUser = async (user: PublicUser) => {
    const newCohort = targetCohort[user.id];
    if (!newCohort || newCohort === user.cohort) return;

    if (
      !confirm(
        `Move ${user.name} from ${user.cohort} to ${newCohort}?`
      )
    ) {
      return;
    }

    setMigratingId(user.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort: newCohort }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to migrate user');
        return;
      }
      setTargetCohort((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      await load();
    } catch {
      setError('Network error migrating user.');
    } finally {
      setMigratingId(null);
    }
  };

  const formatJoined = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const otherCohorts = cohorts.filter((c) => c.id !== cohortLabel);

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
      >
        <ArrowLeft size={16} /> Back to Settings
      </Link>

      <PageHeader
        title="Members"
        subtitle={
          isSuperAdmin
            ? `${total} students across all classes`
            : `${total} ${cohortLabel} students joined`
        }
        right={
          <div className="rounded-full bg-[var(--accent-light)] p-2.5">
            <Users size={20} className="text-accent" />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-display text-accent">{total}</p>
          <p className="text-caption text-[var(--text-secondary)]">Total members</p>
        </div>
        <div className="card text-center">
          <p className="text-display text-accent">{adminCount}</p>
          <p className="text-caption text-[var(--text-secondary)]">Admins</p>
        </div>
      </div>

      <p className="text-caption mb-4 text-[var(--text-secondary)]">
        Admins can update the shared class schedule for their group. Assign a trusted
        classmate to help populate the timetable.
        {isSuperAdmin && ' As platform owner, you see every class.'}
      </p>

      {error && (
        <p className="mb-4 rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-caption text-[var(--danger-text)]">
          {error}
        </p>
      )}

      {!loaded ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="card py-8 text-center">
          <p className="text-body text-[var(--text-secondary)]">No members yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isOwner = user.email === PRIMARY_OWNER_EMAIL;
            const isAdminUser = user.role === 'admin';
            const currentTarget = targetCohort[user.id];
            const hasCohortChange =
              currentTarget && currentTarget !== user.cohort;

            return (
              <div key={user.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-subtitle truncate">{user.name}</p>
                      {isAdminUser && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro font-semibold text-accent">
                          <Shield size={10} />
                          Admin
                        </span>
                      )}
                      {isOwner && (
                        <span className="rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-micro font-semibold text-[var(--text-secondary)]">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-caption mt-1 truncate text-[var(--text-secondary)]">
                      {user.email}
                    </p>
                    <p className="text-caption mt-1 text-[var(--text-tertiary)]">
                      Joined {formatJoined(user.createdAt)} · {user.cohort}
                    </p>

                    {!isOwner && otherCohorts.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={targetCohort[user.id] ?? user.cohort}
                          onChange={(e) =>
                            setTargetCohort((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-[var(--border)] bg-bg-base px-2 py-1.5 text-micro"
                        >
                          {cohorts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        {hasCohortChange && (
                          <button
                            type="button"
                            disabled={migratingId === user.id}
                            onClick={() => migrateUser(user)}
                            className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-micro font-semibold text-white disabled:opacity-50"
                          >
                            {migratingId === user.id ? (
                              '...'
                            ) : (
                              <>
                                <ArrowRightLeft size={12} />
                                Move
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!isOwner && (
                    <button
                      type="button"
                      disabled={updatingId === user.id}
                      onClick={() => toggleRole(user)}
                      className={`shrink-0 rounded-xl px-3 py-2 text-micro font-semibold ${
                        isAdminUser
                          ? 'border border-[var(--border)] text-[var(--text-secondary)]'
                          : 'bg-accent text-white'
                      } disabled:opacity-50`}
                    >
                      {updatingId === user.id ? (
                        '…'
                      ) : isAdminUser ? (
                        <span className="inline-flex items-center gap-1">
                          <ShieldOff size={12} />
                          Remove
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Shield size={12} />
                          Make Admin
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/admin/schedule"
          className="flex-1 rounded-xl border border-[var(--border)] py-3 text-center text-caption font-semibold"
        >
          Class Schedule
        </Link>
        <Link
          href="/settings"
          className="flex-1 rounded-xl bg-accent py-3 text-center text-caption font-semibold text-white"
        >
          Settings
        </Link>
      </div>
    </main>
  );
}
