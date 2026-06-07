'use client';

import { useState } from 'react';
import type { ClassType, DayOfWeek } from '@/lib/types';
import { detectTypeFromVenue } from '@/lib/utils';
import DaySelector from './DaySelector';
import TypeSelector from './TypeSelector';

export interface ClassFormData {
  courseCode: string;
  courseName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  venue: string;
  lecturer: string;
  type: ClassType;
  notificationEnabled: boolean;
  notificationMinsBefore: number;
  notes: string;
}

interface ClassFormProps {
  initial?: Partial<ClassFormData>;
  onSubmit: (data: ClassFormData) => void;
  onDelete?: () => void;
  submitLabel?: string;
}

const REMINDER_OPTIONS = [5, 10, 15, 30];

export default function ClassForm({
  initial,
  onSubmit,
  onDelete,
  submitLabel = 'Save Class',
}: ClassFormProps) {
  const [form, setForm] = useState<ClassFormData>({
    courseCode: initial?.courseCode ?? '',
    courseName: initial?.courseName ?? '',
    day: initial?.day ?? 'Monday',
    startTime: initial?.startTime ?? '09:00',
    endTime: initial?.endTime ?? '10:00',
    venue: initial?.venue ?? '',
    lecturer: initial?.lecturer ?? '',
    type: initial?.type ?? 'CLASS_PHYSICAL',
    notificationEnabled: initial?.notificationEnabled ?? true,
    notificationMinsBefore: initial?.notificationMinsBefore ?? 10,
    notes: initial?.notes ?? '',
  });

  const update = <K extends keyof ClassFormData>(key: K, value: ClassFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'venue' && typeof value === 'string') {
        const detected = detectTypeFromVenue(value);
        if (detected) next.type = detected;
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
          Course Code
        </label>
        <input
          required
          value={form.courseCode}
          onChange={(e) => update('courseCode', e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="MN 374"
        />
      </div>

      <div>
        <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
          Course Name
        </label>
        <input
          required
          value={form.courseName}
          onChange={(e) => update('courseName', e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Surface Mining Systems"
        />
      </div>

      <div>
        <label className="text-micro mb-2 block uppercase text-[var(--text-tertiary)]">
          Day
        </label>
        <DaySelector selected={form.day} onChange={(d) => update('day', d)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
            Start Time
          </label>
          <input
            type="time"
            required
            value={form.startTime}
            onChange={(e) => update('startTime', e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
            End Time
          </label>
          <input
            type="time"
            required
            value={form.endTime}
            onChange={(e) => update('endTime', e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <div>
        <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
          Venue
        </label>
        <input
          value={form.venue}
          onChange={(e) => update('venue', e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="CCG2 (leave blank if VLE)"
        />
      </div>

      <div>
        <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
          Lecturer
        </label>
        <input
          value={form.lecturer}
          onChange={(e) => update('lecturer', e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="AB Yaley"
        />
      </div>

      <div>
        <label className="text-micro mb-2 block uppercase text-[var(--text-tertiary)]">
          Type
        </label>
        <TypeSelector value={form.type} onChange={(t) => update('type', t)} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-bg-card p-4 shadow-sm">
        <div>
          <p className="text-body">Notify before class</p>
          <select
            value={form.notificationMinsBefore}
            onChange={(e) =>
              update('notificationMinsBefore', parseInt(e.target.value, 10))
            }
            className="text-caption mt-1 text-[var(--text-secondary)] bg-transparent outline-none"
            disabled={!form.notificationEnabled}
          >
            {REMINDER_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} min before
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.notificationEnabled}
          onClick={() => update('notificationEnabled', !form.notificationEnabled)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            form.notificationEnabled ? 'bg-accent' : 'bg-[var(--border)]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              form.notificationEnabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      <div>
        <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Add notes..."
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-accent py-3.5 text-body font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
      >
        {submitLabel}
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="w-full py-2 text-body font-medium text-red-500"
        >
          Delete
        </button>
      )}
    </form>
  );
}
