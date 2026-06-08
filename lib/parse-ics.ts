import { v4 as uuidv4 } from 'uuid';
import type { ClassEntry, ClassType, DayOfWeek } from './types';
import { detectTypeFromVenue } from './utils';

const DAY_FROM_RRULE: Record<string, DayOfWeek> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
};

function unfoldIcs(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function parseTimeFromIcs(value: string): string | null {
  const match = value.match(/(\d{2})(\d{2})(\d{2})?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function parseDaysFromRrule(rrule: string): DayOfWeek[] {
  const byday = rrule.match(/BYDAY=([A-Z,]+)/i)?.[1];
  if (!byday) return [];
  return byday
    .split(',')
    .map((d) => {
      const code = d.trim().toUpperCase();
      return DAY_FROM_RRULE[code] ?? DAY_FROM_RRULE[code.slice(-2)];
    })
    .filter((d): d is DayOfWeek => Boolean(d));
}

function splitSummary(summary: string): { courseCode: string; courseName: string } {
  const separators = [' - ', ' – ', ' — ', ' · ', ' | '];
  for (const sep of separators) {
    if (summary.includes(sep)) {
      const [code, ...rest] = summary.split(sep);
      return {
        courseCode: code.trim(),
        courseName: rest.join(sep).trim() || code.trim(),
      };
    }
  }
  const codeMatch = summary.match(/^([A-Z]{2,3}\s*\d+[A-Z]?)/i);
  if (codeMatch) {
    return {
      courseCode: codeMatch[1].trim(),
      courseName: summary.slice(codeMatch[0].length).trim() || summary.trim(),
    };
  }
  return { courseCode: summary.trim(), courseName: summary.trim() };
}

function detectClassType(venue: string, summary: string, url?: string): ClassType {
  if (url && /zoom|meet|teams/i.test(url)) return 'CLASS_VLE';
  const fromVenue = detectTypeFromVenue(venue);
  if (fromVenue) return fromVenue;
  if (/vle|online|zoom/i.test(summary) || /vle|online/i.test(venue)) return 'CLASS_VLE';
  if (/practical|lab/i.test(summary)) return 'PRACTICAL';
  return 'CLASS_PHYSICAL';
}

function parseVeventBlock(block: string): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const fields: Record<string, string> = {};

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(';')[0].toUpperCase();
    fields[key] = value;
  }

  const summary = fields.SUMMARY ?? 'Untitled Class';
  const startRaw = fields.DTSTART ?? '';
  const endRaw = fields.DTEND ?? '';
  const startTime = parseTimeFromIcs(startRaw);
  const endTime = parseTimeFromIcs(endRaw);
  if (!startTime || !endTime) return [];

  const rrule = fields.RRULE ?? '';
  let days = parseDaysFromRrule(rrule);
  if (days.length === 0) {
    const dayFromStart = new Date(
      startRaw.replace(/^.*:(\d{4})(\d{2})(\d{2})T.*/, '$1-$2-$3')
    );
    if (!Number.isNaN(dayFromStart.getTime())) {
      const names: DayOfWeek[] = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      days = [names[dayFromStart.getDay()]];
    }
  }
  if (days.length === 0) return [];

  const { courseCode, courseName } = splitSummary(summary);
  const venue = fields.LOCATION ?? '';
  const meetingUrl = fields.URL?.startsWith('http') ? fields.URL : undefined;
  const notes = (fields.DESCRIPTION ?? '').replace(/\\n/g, '\n').trim();
  const type = detectClassType(venue, summary, meetingUrl);

  return days.map((day) => ({
    id: uuidv4(),
    courseCode,
    courseName,
    day,
    startTime,
    endTime,
    venue,
    lecturer: '',
    type,
    notificationEnabled: true,
    notificationMinsBefore: 10,
    notes,
    meetingUrl,
    isDefault: true,
  }));
}

export function parseICSFile(content: string): Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] {
  const flat = unfoldIcs(content);
  const blocks = flat.split('BEGIN:VEVENT').slice(1);
  const classes: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[] = [];

  for (const chunk of blocks) {
    const block = chunk.split('END:VEVENT')[0] ?? chunk;
    classes.push(...parseVeventBlock(block));
  }

  return classes;
}
