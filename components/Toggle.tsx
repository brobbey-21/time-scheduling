'use client';

import { cn } from '@/lib/utils';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  id?: string;
}

export default function Toggle({ enabled, onChange, label, id }: ToggleProps) {
  const toggleId = id ?? 'toggle';

  return (
    <div className="flex items-center justify-between">
      {label && (
        <label htmlFor={toggleId} className="text-caption text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          enabled ? 'bg-accent' : 'bg-[var(--border)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
            enabled ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}
