'use client';

import Link from 'next/link';
import { Home, WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-light)]">
        <WifiOff size={28} className="text-accent" />
      </div>
      <h1 className="text-title">You&apos;re offline</h1>
      <p className="text-body mt-2 max-w-[280px] text-[var(--text-secondary)]">
        This page isn&apos;t cached yet. Open the app once while online, or go
        back to a page you&apos;ve already visited.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-body font-semibold text-white"
      >
        <Home size={18} />
        Go to Today
      </Link>
    </main>
  );
}
