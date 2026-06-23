'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Video } from 'lucide-react';
import type { ClassEntry } from '@/lib/types';
import { TYPE_CONFIG } from '@/lib/types';
import {
  formatDurationBetween,
  formatTime12,
  isClassActive,
  minutesRemainingInBlock,
} from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface ClassCardProps {
  cls: ClassEntry;
  showTime?: boolean;
}

const ClassCard = memo(function ClassCard({ cls, showTime = false }: ClassCardProps) {
  const tint = TYPE_CONFIG[cls.type].cardTint;
  const active = isClassActive(cls.startTime, cls.endTime);
  const showJoinNow =
    cls.type === 'CLASS_VLE' && cls.meetingUrl && active;
  const meta = [cls.venue, cls.lecturer].filter(Boolean).join(' · ');

  return (
    <div
      className={`card card-glass transition-transform active:scale-[0.98] ${
        active ? 'ring-2 ring-accent/30' : ''
      } ${showTime ? 'py-3' : ''}`}
      style={{ background: `var(${tint})` }}
    >
      <Link href={`/manage/${cls.id}`} className="block">
        <div className="flex gap-3">
          {showTime && (
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--glass-time-bg)] px-1 py-2 text-center backdrop-blur-sm">
              <span className="text-caption font-bold leading-none text-[var(--text-primary)]">
                {formatTime12(cls.startTime)}
              </span>
              <span className="text-micro mt-1 leading-none text-[var(--text-tertiary)]">
                {formatTime12(cls.endTime)}
              </span>
              {active && (
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-micro font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  {cls.courseCode}
                </span>
                {cls.isDefault && (
                  <span className="rounded-full bg-[var(--accent-light)] px-1.5 py-0.5 text-micro font-semibold text-accent">
                    Official
                  </span>
                )}
                {!cls.isDefault && cls.plannerGenerated && (
                  <span className="rounded-full bg-[var(--type-study-bg)] px-1.5 py-0.5 text-micro font-semibold text-[var(--type-study-text)]">
                    Planned
                  </span>
                )}
                {active && (
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-micro font-semibold text-accent">
                    Now
                  </span>
                )}
              </div>
              <TypeBadge type={cls.type} pulse={active} />
            </div>
            <h3 className="text-subtitle mt-1 line-clamp-2 leading-snug text-[var(--text-primary)]">
              {cls.courseName}
            </h3>
            {!showTime && (
              <p className="text-caption mt-1 font-medium text-[var(--text-secondary)]">
                {formatTime12(cls.startTime)} – {formatTime12(cls.endTime)}
              </p>
            )}
            {meta && cls.type !== 'REST' && cls.type !== 'STUDY' && (
              <p className="text-caption mt-1 truncate text-[var(--text-tertiary)]">
                {meta}
              </p>
            )}
            {cls.type === 'REST' && (
              <p className="text-caption mt-1 text-[var(--text-tertiary)]">
                {formatDurationBetween(cls.startTime, cls.endTime)}
                {active
                  ? ` · ${minutesRemainingInBlock(cls.endTime)} min left`
                  : cls.notificationEnabled
                    ? ' · Reminder when break ends'
                    : ''}
              </p>
            )}
            {cls.type === 'STUDY' && cls.notes && (
              <p className="text-caption mt-1 line-clamp-2 text-[var(--text-secondary)]">
                {cls.notes}
              </p>
            )}
          </div>
        </div>
      </Link>

      {showJoinNow && (
        <button
          type="button"
          onClick={() => window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer')}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-caption font-bold text-white shadow-sm"
        >
          <Video size={16} />
          Join now
        </button>
      )}
    </div>
  );
});

export default ClassCard;
