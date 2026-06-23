'use client';

import Link from 'next/link';
import { ChevronRight, Video } from 'lucide-react';
import type { ClassEntry } from '@/lib/types';
import { formatTime12, isClassActive } from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface NextUpCardProps {
  cls: ClassEntry;
}

export default function NextUpCard({ cls }: NextUpCardProps) {
  const active = isClassActive(cls.startTime, cls.endTime);
  const showJoinNow =
    cls.type === 'CLASS_VLE' && cls.meetingUrl && active;

  return (
    <div
      className="rounded-2xl p-5 text-white shadow-md"
      style={{
        background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000))',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-micro uppercase tracking-wider opacity-90">
          {active ? 'Happening now' : 'Next Up'}
        </span>
        <span className="text-caption font-medium">
          {formatTime12(cls.startTime)}
        </span>
      </div>

      <p className="text-micro mt-3 uppercase tracking-wider text-white/70">
        {cls.courseCode}
      </p>
      <h2 className="text-title mt-1 leading-snug text-white">{cls.courseName}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-caption text-white/80">
        {cls.venue && <span>{cls.venue}</span>}
        {cls.lecturer && <span>{cls.lecturer}</span>}
        <TypeBadge type={cls.type} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        {showJoinNow && (
          <button
            type="button"
            onClick={() => window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-caption font-bold text-accent shadow-sm"
          >
            <Video size={16} />
            Join now
          </button>
        )}
        {!showJoinNow && (
          <Link
            href={`/manage/${cls.id}`}
            className="flex items-center gap-1 text-caption font-medium text-white/90"
          >
            View Details
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
