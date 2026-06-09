'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';
import type { ClassEntry } from '@/lib/types';
import { TYPE_CONFIG } from '@/lib/types';
import {
  formatDurationBetween,
  formatTime12,
  formatTimeRange,
  isClassActive,
  minutesRemainingInBlock,
} from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface ClassCardProps {
  cls: ClassEntry;
  showTime?: boolean;
}

export default function ClassCard({ cls, showTime = false }: ClassCardProps) {
  const tint = TYPE_CONFIG[cls.type].cardTint;
  const active = isClassActive(cls.startTime, cls.endTime);
  const showJoinNow =
    cls.type === 'CLASS_VLE' && cls.meetingUrl && active;

  return (
    <div
      className={`card transition-transform active:scale-[0.98] ${
        active ? 'ring-2 ring-accent/25' : ''
      }`}
      style={{ background: `var(${tint})` }}
    >
      <Link href={`/manage/${cls.id}`} className="block">
        <div className="flex gap-3">
          {showTime && (
            <div className="flex w-[4.5rem] shrink-0 flex-col items-center pt-0.5 text-center">
              <span className="text-caption font-semibold leading-tight text-[var(--text-primary)]">
                {formatTime12(cls.startTime)}
              </span>
              <span className="text-micro mt-0.5 leading-tight text-[var(--text-tertiary)]">
                {formatTime12(cls.endTime)}
              </span>
              {active && (
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
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
            <h3 className="text-title mt-1 leading-snug text-[var(--text-primary)]">
              {cls.courseName}
            </h3>
            <p className="text-caption mt-2 font-medium text-[var(--text-secondary)]">
              {formatTimeRange(cls.startTime, cls.endTime)}
              {cls.type === 'REST' && (
                <span className="font-normal text-[var(--text-tertiary)]">
                  {' '}
                  · {formatDurationBetween(cls.startTime, cls.endTime)}
                </span>
              )}
            </p>
            {cls.type === 'REST' && (
              <p className="text-caption mt-1 text-[var(--text-tertiary)]">
                {active
                  ? `${minutesRemainingInBlock(cls.endTime)} min left`
                  : cls.notificationEnabled
                    ? 'Reminder when break ends'
                    : null}
              </p>
            )}
            {cls.type !== 'REST' && (cls.lecturer || cls.venue) && (
              <p className="text-caption mt-1 text-[var(--text-secondary)]">
                {[cls.lecturer, cls.venue].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between gap-2">
        {showJoinNow ? (
          <button
            type="button"
            onClick={() => window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-caption font-bold text-white shadow-sm"
          >
            <Video size={16} />
            Join now
          </button>
        ) : (
          <span />
        )}
        <TypeBadge type={cls.type} pulse={active} />
      </div>
    </div>
  );
}
