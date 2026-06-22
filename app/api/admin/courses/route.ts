import { NextResponse } from 'next/server';
import { getSessionUser, isAdmin } from '@/lib/auth-session';
import {
  getCourseRegistry,
  mergeRegistryFromSchedule,
  saveCourseRegistry,
} from '@/lib/course-registry-storage';
import { getSharedSchedule } from '@/lib/shared-schedule-storage';
import type { CourseRegistryEntry } from '@/lib/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const schedule = await getSharedSchedule(user.cohort);
  const courses = await getCourseRegistry(user.cohort, schedule);
  const merged = mergeRegistryFromSchedule(courses, schedule);
  return NextResponse.json({ courses: merged });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await request.json()) as { courses?: CourseRegistryEntry[] };
  const courses = body.courses ?? [];

  const saved = await saveCourseRegistry(user.cohort, courses);
  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: courses.length });
}
