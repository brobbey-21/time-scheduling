'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Shield, User } from 'lucide-react';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  cohort: string;
}

interface AccountSectionProps {
  user: SessionUser;
  onLogout: () => Promise<void>;
}

export default function AccountSection({ user, onLogout }: AccountSectionProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <section className="mb-6">
      <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Account</p>
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-light)]">
            <User size={18} className="text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-body truncate">{user.name}</p>
            <p className="text-caption truncate text-[var(--text-secondary)]">
              {user.email} · {user.cohort}
            </p>
            {user.role === 'admin' && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-micro font-semibold text-accent">
                <Shield size={10} />
                Admin
              </span>
            )}
          </div>
        </div>
        {user.role === 'admin' && (
          <div className="space-y-2">
            <Link
              href="/admin"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-body font-semibold text-white"
            >
              <Shield size={18} />
              Admin Panel
            </Link>
            <Link
              href="/admin/users"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold"
            >
              View Members & Assign Admins
            </Link>
          </div>
        )}
        <div className="border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-body font-semibold text-[var(--danger-text)]"
          >
            <LogOut size={18} />
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
          <p className="text-caption mt-3 text-center text-[var(--text-tertiary)]">
            Switch account or use a shared device safely
          </p>
        </div>
      </div>
    </section>
  );
}
