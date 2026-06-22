'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { fetchSharedSchedule } from '@/lib/admin-schedule';
import type { ClassEntry, ClassType, DayOfWeek } from '@/lib/types';
import { DAY_SHORT, DAYS } from '@/lib/types';
import { cn } from '@/lib/utils';

const GRID_START = 7 * 60;
const GRID_END = 22 * 60;
const SLOT = 60;

const TYPE_COLORS: Record<ClassType, string> = {
  CLASS_PHYSICAL: 'bg-blue-100 text-blue-900 border-blue-200',
  CLASS_VLE: 'bg-purple-100 text-purple-900 border-purple-200',
  PRACTICAL: 'bg-amber-100 text-amber-900 border-amber-200',
  STUDY: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  REST: 'bg-gray-100 text-gray-600 border-gray-200',
};

function timeSlots(): string[] {
  const slots: string[] = [];
  for (let m = GRID_START; m < GRID_END; m += SLOT) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

export default function AdminScheduleGridPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [cohort, setCohort] = useState('your class');
  const slots = useMemo(() => timeSlots(), []);

  const load = () => {
    fetchSharedSchedule().then(setClasses);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.cohort) setCohort(data.user.cohort);
      });
    load();
  }, []);

  const byDay = (day: DayOfWeek) =>
    classes.filter((c) => c.day === day && c.type !== 'REST' && c.type !== 'STUDY');

  return (
    <>
      <main className="px-5 pt-8 pb-8 md:hidden">
        <Link
          href="/admin/schedule"
          className="mb-4 inline-flex items-center gap-1 text-caption font-medium text-accent"
        >
          <ArrowLeft size={16} /> List view
        </Link>
        <PageHeader
          title="Week grid"
          subtitle="Desktop only — use a wider screen or list view on mobile"
        />
        <p className="text-body text-[var(--text-secondary)]">
          The week grid editor is built for PC screens. On your phone, use{' '}
          <Link href="/admin/schedule" className="font-medium text-accent">
            list view
          </Link>{' '}
          to add and edit classes.
        </p>
      </main>
      <main className="hidden px-5 pt-8 pb-8 md:block">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/admin/schedule"
          className="inline-flex items-center gap-1 text-caption font-medium text-accent"
        >
          <ArrowLeft size={16} /> List view
        </Link>
        <Link href="/admin/courses" className="text-caption font-medium text-accent">
          Course credits
        </Link>
      </div>

      <PageHeader
        title="Week grid"
        subtitle={`${cohort} official timetable — click a cell to add a session`}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] border-collapse text-caption">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
              <th className="sticky left-0 z-10 w-16 bg-[var(--bg-base)] px-2 py-2 text-left font-medium">
                Time
              </th>
              {DAYS.slice(0, 5).map((day) => (
                <th key={day} className="px-2 py-2 text-left font-medium">
                  {DAY_SHORT[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot} className="border-b border-[var(--border)]">
                <td className="sticky left-0 z-10 bg-bg-card px-2 py-1 text-[var(--text-tertiary)]">
                  {slot}
                </td>
                {DAYS.slice(0, 5).map((day) => {
                  const cellClasses = byDay(day).filter((c) => c.startTime === slot);
                  return (
                    <td key={`${day}-${slot}`} className="min-h-[48px] p-1 align-top">
                      {cellClasses.length === 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/admin/schedule/add?day=${day}&start=${slot}`)
                          }
                          className="flex h-10 w-full items-center justify-center rounded-lg border border-dashed border-transparent text-[var(--text-tertiary)] hover:border-accent/40 hover:bg-[var(--accent-light)]/30"
                          aria-label={`Add class ${day} ${slot}`}
                        >
                          <Plus size={14} />
                        </button>
                      ) : (
                        cellClasses.map((cls) => (
                          <Link
                            key={cls.id}
                            href={`/admin/schedule/${cls.id}/edit`}
                            className={cn(
                              'mb-1 block rounded-lg border px-2 py-1.5 transition-opacity hover:opacity-90',
                              TYPE_COLORS[cls.type]
                            )}
                          >
                            <p className="font-semibold">{cls.courseCode}</p>
                            <p className="text-micro truncate opacity-80">
                              {cls.startTime}–{cls.endTime}
                            </p>
                            {cls.venue && (
                              <p className="text-micro truncate opacity-70">{cls.venue}</p>
                            )}
                          </Link>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
    </>
  );
}
