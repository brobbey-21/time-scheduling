'use client';

import Link from 'next/link';
import type { ClassEntry } from '@/lib/types';
import { TYPE_CONFIG } from '@/lib/types';
import { formatTime12, isClassActive } from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface ClassCardProps {
  cls: ClassEntry;
  showTime?: boolean;
}

export default function ClassCard({ cls, showTime = false }: ClassCardProps) {
  const tint = TYPE_CONFIG[cls.type].cardTint;
  const active = isClassActive(cls.startTime, cls.endTime);

  return (
    <Link href={`/manage/${cls.id}`} className="block">
      <div
        className="card transition-transform active:scale-[0.98]"
        style={{ background: `var(${tint})` }}
      >
        <div className="flex gap-3">
          {showTime && (
            <div className="text-caption shrink-0 pt-0.5 text-[var(--text-tertiary)]">
              {formatTime12(cls.startTime)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-subtitle truncate">
              {cls.courseCode} · {cls.courseName}
            </p>
            {(cls.lecturer || cls.venue) && (
              <p className="text-caption mt-1 text-[var(--text-secondary)]">
                {[cls.lecturer, cls.venue].filter(Boolean).join('  ·  ')}
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <TypeBadge type={cls.type} pulse={active} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
