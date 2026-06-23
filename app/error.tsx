'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Root error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <div className="rounded-full bg-[var(--danger-bg)] p-4">
        <AlertTriangle size={32} className="text-[var(--danger-text)]" />
      </div>
      <h1 className="text-title mt-4">Something went wrong</h1>
      <p className="text-caption mt-2 max-w-xs text-[var(--text-secondary)]">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-body font-semibold text-white"
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </main>
  );
}
