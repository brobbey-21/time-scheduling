'use client';

import Link from 'next/link';
import { ChevronRight, Video } from 'lucide-react';
import type { ClassEntry } from '@/lib/types';
import { formatTime12 } from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface NextUpCardProps {
  cls: ClassEntry;
}

export default function NextUpCard({ cls }: NextUpCardProps) {
  const hasMeeting = cls.type === 'CLASS_VLE' && cls.meetingUrl;

  return (
    <div
      className="rounded-2xl p-5 text-white shadow-md"
      style={{
        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-micro uppercase tracking-wider opacity-90">
          Next Up
        </span>
        <span className="text-caption font-medium">
          {formatTime12(cls.startTime)}
        </span>
      </div>

      <h2 className="text-title mt-3 text-white">{cls.courseCode}</h2>
      <p className="text-body mt-1 text-white/90">{cls.courseName}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-caption text-white/80">
        {cls.venue && <span>{cls.venue}</span>}
        {cls.lecturer && <span>{cls.lecturer}</span>}
        <TypeBadge type={cls.type} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        {hasMeeting && (
          <button
            type="button"
            onClick={() => window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-caption font-semibold text-accent"
          >
            <Video size={16} />
            Join Zoom
          </button>
        )}
        <Link
          href={`/manage/${cls.id}`}
          className="flex items-center gap-1 text-caption font-medium text-white/90"
        >
          View Details
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
