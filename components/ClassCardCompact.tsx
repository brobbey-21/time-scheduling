'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ClassEntry } from '@/lib/types';
import { formatTime12 } from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface ClassCardCompactProps {
  cls: ClassEntry;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  href?: string;
  badge?: string;
}

export default function ClassCardCompact({
  cls,
  selectable,
  selected,
  onSelect,
  href,
  badge,
}: ClassCardCompactProps) {
  const linkHref = href ?? `/manage/${cls.id}`;
  const showOfficial = badge ?? (cls.isDefault ? 'Official' : undefined);
  const showPlanned =
    !cls.isDefault && cls.plannerGenerated ? 'Planned' : undefined;
  const showPersonal = !cls.isDefault && !cls.plannerGenerated ? 'My Routine' : undefined;
  const label = showOfficial ?? showPlanned ?? showPersonal;

  const content = (
    <div className="card flex items-center gap-3 transition-transform active:scale-[0.98]">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect?.(cls.id)}
          className="h-5 w-5 shrink-0 accent-[var(--accent)]"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-subtitle">{cls.courseCode}</p>
          <TypeBadge type={cls.type} />
        </div>
        <p className="text-caption mt-0.5 truncate text-[var(--text-secondary)]">
          {cls.courseName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-caption text-[var(--text-tertiary)]">
            {cls.day} · {formatTime12(cls.startTime)}
          </p>
          {label && (
            <span
              className={`rounded-full px-2 py-0.5 text-micro font-semibold ${
                cls.isDefault
                  ? 'bg-[var(--accent-light)] text-accent'
                  : 'bg-[var(--bg-base)] text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </span>
          )}
        </div>
      </div>
      {!selectable && (
        <ChevronRight size={18} className="shrink-0 text-[var(--text-tertiary)]" />
      )}
    </div>
  );

  if (selectable) {
    return (
      <button type="button" className="block w-full text-left" onClick={() => onSelect?.(cls.id)}>
        {content}
      </button>
    );
  }

  return (
    <Link href={linkHref} className="block">
      {content}
    </Link>
  );
}
