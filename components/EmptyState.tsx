'use client';

import type { LucideIcon } from 'lucide-react';
import { Calendar } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
}

export default function EmptyState({
  icon: Icon = Calendar,
  title,
  message,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-light)]">
        <Icon size={28} className="text-accent" />
      </div>
      <p className="text-subtitle">{title}</p>
      {message && (
        <p className="text-caption mt-2 max-w-[240px] text-[var(--text-secondary)]">
          {message}
        </p>
      )}
    </div>
  );
}
