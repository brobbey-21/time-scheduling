import { NextResponse } from 'next/server';
import { getSessionUser, isAdmin } from '@/lib/auth-session';
import { getSharedSchedule, saveSharedSchedule } from '@/lib/shared-schedule-storage';
import type { ClassEntry } from '@/lib/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const classes = await getSharedSchedule();
  return NextResponse.json({ classes });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await request.json()) as { classes?: ClassEntry[] };
  const classes = (body.classes ?? []).map((c) => ({
    ...c,
    isDefault: true as const,
    updatedAt: Date.now(),
  }));

  const saved = await saveSharedSchedule(classes);
  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: classes.length });
}
