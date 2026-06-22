import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { getCourseRegistry } from '@/lib/course-registry-storage';
import { getSharedSchedule } from '@/lib/shared-schedule-storage';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schedule = await getSharedSchedule(user.cohort);
  const courses = await getCourseRegistry(user.cohort, schedule);
  return NextResponse.json({ courses });
}
