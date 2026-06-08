'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';
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
  const hasMeeting = cls.type === 'CLASS_VLE' && cls.meetingUrl;

  return (
    <div
      className="card transition-transform active:scale-[0.98]"
      style={{ background: `var(${tint})` }}
    >
      <Link href={`/manage/${cls.id}`} className="block">
        <div className="flex gap-3">
          {showTime && (
            <div className="text-caption shrink-0 pt-0.5 text-[var(--text-tertiary)]">
              {formatTime12(cls.startTime)}
            </div>
          )}
          <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-subtitle truncate">
                  {cls.courseCode} · {cls.courseName}
                </p>
                {cls.isDefault && (
                  <span className="shrink-0 rounded-full bg-[var(--accent-light)] px-1.5 py-0.5 text-micro font-semibold text-accent">
                    Official
                  </span>
                )}
              </div>
            {(cls.lecturer || cls.venue) && (
              <p className="text-caption mt-1 text-[var(--text-secondary)]">
                {[cls.lecturer, cls.venue].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        {hasMeeting ? (
          <button
            type="button"
            onClick={() => window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-micro font-semibold text-white"
          >
            <Video size={14} />
            Join Class
          </button>
        ) : (
          <span />
        )}
        <TypeBadge type={cls.type} pulse={active} />
      </div>
    </div>
  );
}
