'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';

interface AppRating {
  userId: string;
  userName: string;
  userEmail: string;
  stars: number;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

interface RatingSummary {
  count: number;
  average: number;
  distribution: Record<number, number>;
}

function StarRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cn(
            n <= stars ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'
          )}
        />
      ))}
    </span>
  );
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString('en-GH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<AppRating[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/ratings', { cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to load ratings');
        return;
      }
      const data = (await res.json()) as {
        ratings: AppRating[];
        summary: RatingSummary;
      };
      setRatings(data.ratings);
      setSummary(data.summary);
    } catch {
      setError('Network error loading ratings.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-5 pt-8 pb-8">
      <Link
        href="/admin"
        className="text-caption mb-4 inline-flex items-center gap-1 text-accent"
      >
        <ArrowLeft size={16} />
        Admin
      </Link>

      <PageHeader
        title="App Ratings"
        subtitle="Feedback from MN 3C members"
      />

      {error && (
        <p className="text-caption mb-4 text-[var(--danger-text)]">{error}</p>
      )}

      {!loaded ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : (
        <>
          {summary && summary.count > 0 && (
            <div className="card mb-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-display text-[2rem] leading-none text-accent">
                    {summary.average}
                  </p>
                  <p className="text-caption mt-1 text-[var(--text-secondary)]">
                    Average · {summary.count} rating{summary.count === 1 ? '' : 's'}
                  </p>
                </div>
                <StarRow stars={Math.round(summary.average)} size={18} />
              </div>
              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = summary.distribution[n] ?? 0;
                  const pct = summary.count ? (count / summary.count) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-caption">
                      <span className="w-8 text-[var(--text-tertiary)]">{n}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[var(--text-tertiary)]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {ratings.length === 0 ? (
            <EmptyState
              title="No ratings yet"
              message="When students rate the app in Settings, their feedback will appear here with their names."
            />
          ) : (
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.userId} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-subtitle truncate">{r.userName}</p>
                      <p className="text-caption truncate text-[var(--text-secondary)]">
                        {r.userEmail}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StarRow stars={r.stars} />
                      <p className="text-micro mt-1 text-[var(--text-tertiary)]">
                        {r.stars}/5
                      </p>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-body mt-3 text-[var(--text-secondary)]">
                      “{r.comment}”
                    </p>
                  )}
                  <p className="text-caption mt-3 text-[var(--text-tertiary)]">
                    {formatWhen(r.updatedAt)}
                    {r.updatedAt !== r.createdAt ? ' · updated' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
