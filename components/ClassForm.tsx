'use client';

import { useState } from 'react';
import type { ClassType, DayOfWeek } from '@/lib/types';
import {
  detectTypeFromVenue,
  durationMinutesBetween,
  formatDurationBetween,
  formatRestLabel,
  formatTime12,
} from '@/lib/utils';
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
  meetingUrl: string;
  notificationEnabled: boolean;
  notificationMinsBefore: number;
  notes: string;
}

interface ClassFormProps {
  initial?: Partial<ClassFormData>;
  onSubmit: (data: ClassFormData) => void;
  onDelete?: () => void;
  submitLabel?: string;
  dayHint?: string;
  existingTimes?: string[];
}

const REMINDER_OPTIONS = [5, 10, 15, 30];

export default function ClassForm({
  initial,
  onSubmit,
  onDelete,
  submitLabel = 'Save Class',
  dayHint,
  existingTimes = [],
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
    meetingUrl: initial?.meetingUrl ?? '',
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
      if (key === 'type' && value === 'REST') {
        next.courseCode = 'REST';
        next.courseName = formatRestLabel(next.startTime, next.endTime);
        next.notificationEnabled = true;
        next.notificationMinsBefore = 0;
      }
      if (
        (key === 'startTime' || key === 'endTime') &&
        next.type === 'REST'
      ) {
        next.courseName = formatRestLabel(next.startTime, next.endTime);
      }
      return next;
    });
  };

  const restDurationMins =
    form.type === 'REST'
      ? durationMinutesBetween(form.startTime, form.endTime)
      : 0;

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
        {dayHint && (
          <p className="text-caption mt-2 text-[var(--text-secondary)]">{dayHint}</p>
        )}
      </div>

      {existingTimes.length > 0 && (
        <div className="rounded-xl bg-[var(--bg-base)] p-3">
          <p className="text-micro uppercase text-[var(--text-tertiary)]">
            Already on {form.day}
          </p>
          <p className="text-caption mt-1 text-[var(--text-secondary)]">
            {existingTimes.join(' · ')}
          </p>
        </div>
      )}

      {form.type === 'REST' && (
        <div className="rounded-xl bg-[var(--type-rest-bg)] p-4">
          <p className="text-body font-semibold text-[var(--type-rest-text)]">
            {restDurationMins > 0
              ? formatRestLabel(form.startTime, form.endTime)
              : 'Set start and end times'}
          </p>
          {restDurationMins > 0 && (
            <p className="text-caption mt-1 text-[var(--text-secondary)]">
              {formatTime12(form.startTime)} – {formatTime12(form.endTime)}
              {form.notificationEnabled
                ? ' · you’ll get a reminder when the break ends'
                : ''}
            </p>
          )}
        </div>
      )}

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

      {form.type === 'CLASS_VLE' && (
        <div>
          <label className="text-micro mb-1.5 block uppercase text-[var(--text-tertiary)]">
            Zoom / Meeting Link
          </label>
          <input
            type="url"
            value={form.meetingUrl}
            onChange={(e) => update('meetingUrl', e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="https://zoom.us/j/..."
          />
          <p className="text-caption mt-1.5 text-[var(--text-tertiary)]">
            Tap Join on the class card to open this link during class time.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-bg-card p-4 shadow-sm">
        <div>
          <p className="text-body">
            {form.type === 'REST' ? 'Remind when break ends' : 'Notify before class'}
          </p>
          {form.type === 'REST' ? (
            <p className="text-caption mt-1 text-[var(--text-secondary)]">
              Alert at {formatTime12(form.endTime)} when rest is over
            </p>
          ) : (
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
          )}
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
