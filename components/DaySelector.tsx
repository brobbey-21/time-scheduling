'use client';

import type { DayOfWeek } from '@/lib/types';
import { DAY_SHORT, DAYS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  selected: DayOfWeek;
  onChange: (day: DayOfWeek) => void;
}

export default function DaySelector({ selected, onChange }: DaySelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Day of week">
      {DAYS.map((day) => {
        const active = selected === day;
        return (
          <button
            key={day}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(day)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-caption font-medium transition-colors backdrop-blur-sm',
              active
                ? 'bg-accent text-white shadow-sm'
                : 'border border-[var(--glass-border)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
            )}
          >
            {DAY_SHORT[day]}
            {active && ' •'}
          </button>
        );
      })}
    </div>
  );
}
