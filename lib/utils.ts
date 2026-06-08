import type { DayOfWeek } from './types';

export function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime12(start)} – ${formatTime12(end)}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getDayNameFromDate(date: Date = new Date()): DayOfWeek {
  const names: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return names[date.getDay()];
}

export function getTodayDayName(): DayOfWeek {
  return getDayNameFromDate(new Date());
}

export function isWeekendDay(day: DayOfWeek): boolean {
  return day === 'Saturday' || day === 'Sunday';
}

export function getWeekdayFromDate(date: Date): DayOfWeek {
  return getDayNameFromDate(date);
}

export function formatDateLong(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateString(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isClassActive(startTime: string, endTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return (
    timeToMinutes(startTime) <= nowMins && nowMins <= timeToMinutes(endTime)
  );
}

export function isClassUpcoming(startTime: string): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(startTime) > nowMins;
}

export function detectTypeFromVenue(venue: string): 'CLASS_VLE' | 'CLASS_PHYSICAL' | null {
  const trimmed = venue.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'vle') return 'CLASS_VLE';
  return 'CLASS_PHYSICAL';
}

export function generateICS(cls: {
  courseCode: string;
  courseName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  venue: string;
  lecturer: string;
  notes: string;
  meetingUrl?: string;
}): string {
  const dayMap: Record<DayOfWeek, string> = {
    Monday: 'MO',
    Tuesday: 'TU',
    Wednesday: 'WE',
    Thursday: 'TH',
    Friday: 'FR',
    Saturday: 'SA',
    Sunday: 'SU',
  };
  const [sh, sm] = cls.startTime.split(':');
  const [eh, em] = cls.endTime.split(':');
  const uid = `${cls.courseCode}-${cls.day}@isaac-class-manager`;
  const desc = [cls.lecturer, cls.notes].filter(Boolean).join('\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Isaac Class Manager//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${cls.courseCode} - ${cls.courseName}`,
    `LOCATION:${cls.venue || 'TBD'}`,
    `DESCRIPTION:${desc}`,
    ...(cls.meetingUrl ? [`URL:${cls.meetingUrl}`] : []),
    `RRULE:FREQ=WEEKLY;BYDAY=${dayMap[cls.day]}`,
    `DTSTART;TZID=Africa/Accra:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}T${sh}${sm}00`,
    `DTEND;TZID=Africa/Accra:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}T${eh}${em}00`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
