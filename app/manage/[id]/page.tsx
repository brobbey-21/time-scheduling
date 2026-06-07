'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Coffee,
  Download,
  FlaskConical,
  MapPin,
  MoreHorizontal,
  Pencil,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import TypeBadge from '@/components/TypeBadge';
import { deleteClass, getClassById, updateClass } from '@/lib/db';
import { notifyScheduleRefresh } from '@/lib/notifications';
import { TYPE_CONFIG, TYPE_LABELS } from '@/lib/types';
import type { ClassEntry } from '@/lib/types';
import { formatTimeRange, generateICS } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  MapPin,
  Wifi,
  FlaskConical,
  BookOpen,
  Coffee,
};

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [cls, setCls] = useState<ClassEntry | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getClassById(id).then((c) => {
      if (c) {
        setCls(c);
        setNotes(c.notes);
      }
    });
  }, [id]);

  if (!cls) {
    return (
      <main className="px-5 pt-8">
        <div className="animate-pulse h-48 rounded-2xl bg-[var(--border)]" />
      </main>
    );
  }

  const config = TYPE_CONFIG[cls.type];
  const Icon = ICONS[config.icon];

  const handleDelete = async () => {
    await deleteClass(id);
    router.push('/manage');
  };

  const handleToggleReminder = async () => {
    const updated = await updateClass(id, {
      notificationEnabled: !cls.notificationEnabled,
    });
    if (updated) {
      setCls(updated);
      notifyScheduleRefresh();
    }
  };

  const handleSaveNotes = async () => {
    const updated = await updateClass(id, { notes });
    if (updated) {
      setCls(updated);
      setEditingNotes(false);
      notifyScheduleRefresh();
    }
  };

  const handleDownloadICS = () => {
    const ics = generateICS(cls);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cls.courseCode.replace(/\s/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="px-5 pt-8 pb-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/manage"
          className="inline-flex items-center gap-1 text-caption font-medium text-accent"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-[var(--text-secondary)]"
          >
            <MoreHorizontal size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl bg-bg-card py-1 shadow-md">
              <Link
                href={`/manage/${id}/edit`}
                className="flex items-center gap-2 px-4 py-2.5 text-caption hover:bg-[var(--bg-card-hover)]"
                onClick={() => setMenuOpen(false)}
              >
                <Pencil size={14} /> Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-caption text-red-500 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="card mb-6"
        style={{ background: `var(${config.cardTint})` }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `var(${config.bg})` }}
          >
            {Icon && (
              <Icon size={28} style={{ color: `var(${config.text})` }} />
            )}
          </div>
          <div>
            <h1 className="text-title">{cls.courseCode}</h1>
            <p className="text-body mt-1 text-[var(--text-secondary)]">
              {cls.courseName}
            </p>
            <div className="mt-3">
              <TypeBadge type={cls.type} />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 space-y-4">
        {[
          { label: 'Day', value: cls.day },
          { label: 'Time', value: formatTimeRange(cls.startTime, cls.endTime) },
          { label: 'Venue', value: cls.venue || '—' },
          { label: 'Lecturer', value: cls.lecturer || '—' },
          { label: 'Type', value: TYPE_LABELS[cls.type] },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-caption text-[var(--text-tertiary)]">{label}</span>
            <span className="text-body text-right">{value}</span>
          </div>
        ))}
      </div>

      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-body">Reminder</p>
          <p className="text-caption text-[var(--text-secondary)]">
            {cls.notificationMinsBefore} minutes before
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={cls.notificationEnabled}
          onClick={handleToggleReminder}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            cls.notificationEnabled ? 'bg-accent' : 'bg-[var(--border)]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              cls.notificationEnabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      <div className="card mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption text-[var(--text-tertiary)]">Notes</span>
          <button
            type="button"
            onClick={() =>
              editingNotes ? handleSaveNotes() : setEditingNotes(true)
            }
            className="text-[var(--text-tertiary)]"
          >
            <Pencil size={14} />
          </button>
        </div>
        {editingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent text-body outline-none"
            autoFocus
          />
        ) : (
          <p className="text-body whitespace-pre-wrap text-[var(--text-secondary)]">
            {cls.notes || 'No notes yet.'}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleDownloadICS}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-bg-card py-3.5 text-body font-semibold shadow-sm"
      >
        <Download size={18} />
        Add to Calendar
      </button>
    </main>
  );
}
