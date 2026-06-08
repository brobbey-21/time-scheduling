import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { getUserClasses, saveUserClasses } from '@/lib/user-data-storage';
import type { ClassEntry } from '@/lib/types';

function personalOnly(classes: ClassEntry[]): ClassEntry[] {
  return classes
    .filter((c) => !c.isDefault)
    .map((c) => ({ ...c, isDefault: false as const }));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const classes = personalOnly(await getUserClasses(user.id));
  return NextResponse.json({ classes });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { classes?: ClassEntry[] };
  const classes = personalOnly(body.classes ?? []);
  const saved = await saveUserClasses(user.id, classes);

  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: classes.length });
}
