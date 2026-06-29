'use client';

import type { LucideIcon } from 'lucide-react';
import { Calendar } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon = Calendar,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-light)]/60">
        <Icon size={24} className="text-accent" />
      </div>
      <p className="text-body font-semibold">{title}</p>
      {message && (
        <p className="text-caption mt-1.5 max-w-[260px] text-[var(--text-secondary)]">
          {message}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
