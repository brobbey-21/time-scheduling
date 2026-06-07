'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ClassEntry } from '@/lib/types';
import { formatTime12 } from '@/lib/utils';
import TypeBadge from './TypeBadge';

interface NextUpCardProps {
  cls: ClassEntry;
}

export default function NextUpCard({ cls }: NextUpCardProps) {
  return (
    <Link href={`/manage/${cls.id}`} className="block">
      <div
        className="rounded-2xl p-5 text-white shadow-md transition-transform active:scale-[0.98]"
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

        <div className="mt-4 flex items-center gap-1 text-caption font-medium text-white/90">
          View Details
          <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}
