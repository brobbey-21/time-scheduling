'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, Loader2, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMn3cStudent, setIsMn3cStudent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && !isMn3cStudent) {
      setError('Please confirm you are an MN 3C student to create an account.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email, password }
          : { email, password, name, isMn3cStudent };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      const from = searchParams.get('from') || '/';
      router.replace(from);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col px-5 pt-14 pb-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-light)]">
          <GraduationCap size={32} className="text-accent" />
        </div>
        <h1 className="text-display">Class Time</h1>
        <p className="text-body mt-2 text-[var(--text-secondary)]">
          MN 3C class schedule at UMaT
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-3 py-1 text-micro font-semibold uppercase tracking-wide text-accent">
          <ShieldCheck size={12} />
          MN 3C Students Only
        </span>
      </div>

      <div className="mb-6 flex rounded-xl bg-[var(--bg-base)] p-1">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
          }}
          className={`flex-1 rounded-lg py-2.5 text-body font-medium transition-colors ${
            mode === 'login'
              ? 'bg-bg-card text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-tertiary)]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError('');
          }}
          className={`flex-1 rounded-lg py-2.5 text-body font-medium transition-colors ${
            mode === 'register'
              ? 'bg-bg-card text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-tertiary)]'
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
              Full Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Your full name"
            />
          </div>
        )}

        <div>
          <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
            Email
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="you@umat.edu.gh"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
            Password
          </label>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
            placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {mode === 'register' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-bg-card p-4">
            <input
              type="checkbox"
              checked={isMn3cStudent}
              onChange={(e) => setIsMn3cStudent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
            <span className="text-body text-[var(--text-secondary)]">
              I confirm I am an <strong className="text-[var(--text-primary)]">MN 3C</strong> student
              at UMaT. This app is only for our class.
            </span>
          </label>
        )}

        {error && (
          <p className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-caption text-[var(--danger-text)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-body font-semibold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="text-caption mt-8 text-center text-[var(--text-tertiary)]">
        Everyone sees the same class schedule. Your personal routines stay private to your account.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 size={24} className="animate-spin text-accent" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
