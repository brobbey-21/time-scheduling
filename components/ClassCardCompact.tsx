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
}

export default function ClassCardCompact({
  cls,
  selectable,
  selected,
  onSelect,
}: ClassCardCompactProps) {
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
        <p className="text-caption mt-0.5 text-[var(--text-secondary)] truncate">
          {cls.courseName}
        </p>
        <p className="text-caption mt-1 text-[var(--text-tertiary)]">
          {cls.day} · {formatTime12(cls.startTime)}
        </p>
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
    <Link href={`/manage/${cls.id}`} className="block">
      {content}
    </Link>
  );
}
