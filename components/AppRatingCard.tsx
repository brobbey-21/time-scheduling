'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppRatingCardProps {
  userName?: string;
}

export default function AppRatingCard({ userName }: AppRatingCardProps) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rating', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.rating) {
          setStars(data.rating.stars);
          setComment(data.rating.comment ?? '');
          setSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (stars < 1) {
      setError('Tap a star rating first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/rating', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, comment }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save rating');
        return;
      }
      setSaved(true);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  const display = hover || stars;

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-body">Rate Class Time</p>
        <p className="text-caption mt-1 text-[var(--text-secondary)]">
          {userName
            ? `Hi ${userName.split(' ')[0]}, how is the app working for you?`
            : 'How is the app working for you?'}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setStars(value);
              setSaved(false);
            }}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            className="rounded-lg p-1 transition-transform active:scale-95"
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
          >
            <Star
              size={28}
              className={cn(
                'transition-colors',
                value <= display
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-[var(--border)]'
              )}
            />
          </button>
        ))}
        {display > 0 && (
          <span className="text-caption ml-2 font-medium text-[var(--text-secondary)]">
            {display}/5
          </span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        rows={3}
        maxLength={500}
        placeholder="Optional feedback (what you like or what to improve)…"
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-bg-base px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
      />

      {error && (
        <p className="text-caption text-[var(--danger-text)]">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={saving || stars < 1}
        className="w-full rounded-xl bg-accent py-3 text-body font-semibold text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : saved ? 'Update rating' : 'Submit rating'}
      </button>

      {saved && !saving && (
        <p className="text-caption text-center text-[var(--success-text)]">
          Thanks — your rating helps improve Class Time for MN 3C.
        </p>
      )}
    </div>
  );
}
