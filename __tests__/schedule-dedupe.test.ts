import { describe, it, expect } from 'vitest';
import { scheduleSlotKey, dedupeScheduleClasses } from '../lib/schedule-dedupe';
import type { ClassEntry } from '../lib/types';

function makeClass(overrides: Partial<ClassEntry> = {}): ClassEntry {
  return {
    id: '1',
    courseCode: 'MN 301',
    courseName: 'Test Course',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    venue: 'Room 101',
    lecturer: 'Dr. Test',
    type: 'CLASS_PHYSICAL',
    notificationEnabled: false,
    notificationMinsBefore: 15,
    notes: '',
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('scheduleSlotKey', () => {
  it('generates a unique key for day/time/course', () => {
    const cls = makeClass();
    const key = scheduleSlotKey(cls);
    expect(key).toContain('Monday');
    expect(key).toContain('09:00');
    expect(key).toContain('10:00');
    expect(key).toContain('MN 301');
  });
});

describe('dedupeScheduleClasses', () => {
  it('prefers isDefault when two classes share a slot', () => {
    const personal = makeClass({ id: '1', isDefault: false });
    const official = makeClass({ id: '2', isDefault: true });

    const result = dedupeScheduleClasses([personal, official]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('prefers class with venue over one without', () => {
    const withVenue = makeClass({ id: '1', venue: 'Room A' });
    const withoutVenue = makeClass({ id: '2', venue: '' });

    const result = dedupeScheduleClasses([withoutVenue, withVenue]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('sorts by start time', () => {
    const later = makeClass({ id: '1', startTime: '10:00', endTime: '11:00' });
    const earlier = makeClass({ id: '2', startTime: '08:00', endTime: '09:00' });

    const result = dedupeScheduleClasses([later, earlier]);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('1');
  });
});
