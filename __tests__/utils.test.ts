import { describe, it, expect } from 'vitest';
import {
  formatTime12,
  timeToMinutes,
  durationMinutesBetween,
  formatDurationMinutes,
  isWeekendDay,
  toDateString,
  cn,
} from '../lib/utils';

describe('formatTime12', () => {
  it('converts 00:00 to 12:00 AM', () => {
    expect(formatTime12('00:00')).toBe('12:00 AM');
  });

  it('converts 09:00 to 9:00 AM', () => {
    expect(formatTime12('09:00')).toBe('9:00 AM');
  });

  it('converts 12:00 to 12:00 PM', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  it('converts 13:30 to 1:30 PM', () => {
    expect(formatTime12('13:30')).toBe('1:30 PM');
  });

  it('converts 23:59 to 11:59 PM', () => {
    expect(formatTime12('23:59')).toBe('11:59 PM');
  });
});

describe('timeToMinutes', () => {
  it('converts 00:00 to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts 01:00 to 60', () => {
    expect(timeToMinutes('01:00')).toBe(60);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('durationMinutesBetween', () => {
  it('calculates 1 hour', () => {
    expect(durationMinutesBetween('09:00', '10:00')).toBe(60);
  });

  it('returns 0 for end before start', () => {
    expect(durationMinutesBetween('10:00', '09:00')).toBe(0);
  });
});

describe('formatDurationMinutes', () => {
  it('formats 30 min', () => {
    expect(formatDurationMinutes(30)).toBe('30 min');
  });

  it('formats 60 min', () => {
    expect(formatDurationMinutes(60)).toBe('1 hr');
  });

  it('formats 90 min', () => {
    expect(formatDurationMinutes(90)).toBe('1 hr 30 min');
  });
});

describe('isWeekendDay', () => {
  it('returns true for Saturday', () => {
    expect(isWeekendDay('Saturday')).toBe(true);
  });

  it('returns true for Sunday', () => {
    expect(isWeekendDay('Sunday')).toBe(true);
  });

  it('returns false for Monday', () => {
    expect(isWeekendDay('Monday')).toBe(false);
  });
});

describe('toDateString', () => {
  it('formats date correctly', () => {
    const date = new Date(2024, 0, 15);
    expect(toDateString(date)).toBe('2024-01-15');
  });
});

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', 'b', false, null, undefined, 'c')).toBe('a b c');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
