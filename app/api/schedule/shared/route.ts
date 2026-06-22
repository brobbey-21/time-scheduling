import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { canManageCohortSchedule } from '@/lib/auth-permissions';
import { getSharedSchedule, saveSharedSchedule } from '@/lib/shared-schedule-storage';
import type { ClassEntry } from '@/lib/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const classes = await getSharedSchedule(user.cohort);
  return NextResponse.json({ classes, cohort: user.cohort });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canManageCohortSchedule(user, user.cohort)) {
    return NextResponse.json({ error: 'Admin access required for your class' }, { status: 403 });
  }

  const body = (await request.json()) as { classes?: ClassEntry[] };
  const classes = (body.classes ?? []).map((c) => ({
    ...c,
    isDefault: true as const,
    updatedAt: Date.now(),
  }));

  const saved = await saveSharedSchedule(user.cohort, classes);
  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: classes.length, cohort: user.cohort });
}
