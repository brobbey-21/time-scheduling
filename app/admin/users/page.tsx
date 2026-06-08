'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, ShieldOff, Users } from 'lucide-react';
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to load users');
        return;
      }
      const data = (await res.json()) as {
        users: PublicUser[];
        total: number;
        admins: number;
      };
      setUsers(data.users);
      setTotal(data.total);
      setAdminCount(data.admins);
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

  const formatJoined = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

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
        subtitle={`${total} MN 3C students joined`}
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
        Admins can update the shared class schedule. Assign trusted classmates to help
        manage the timetable.
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
