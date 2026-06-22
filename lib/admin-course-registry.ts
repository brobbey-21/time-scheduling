import { normalizeCourseCode } from './course-catalog';
import type { CourseRegistryEntry } from './types';

export async function upsertCourseInRegistry(entry: {
  courseCode: string;
  courseName: string;
  creditHours: 1 | 2 | 3;
}): Promise<void> {
  const res = await fetch('/api/admin/courses', { cache: 'no-store' });
  if (!res.ok) return;

  const data = (await res.json()) as { courses?: CourseRegistryEntry[] };
  const courses = data.courses ?? [];
  const code = normalizeCourseCode(entry.courseCode);
  const idx = courses.findIndex((c) => normalizeCourseCode(c.courseCode) === code);

  const next: CourseRegistryEntry = {
    courseCode: code,
    courseName: entry.courseName,
    creditHours: entry.creditHours,
    cwaCritical: entry.creditHours === 3,
  };

  if (idx >= 0) {
    courses[idx] = { ...courses[idx], ...next };
  } else {
    courses.push(next);
  }

  await fetch('/api/admin/courses', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courses }),
  });
}
