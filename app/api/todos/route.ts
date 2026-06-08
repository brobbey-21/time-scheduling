import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserTodos, saveUserTodos } from '@/lib/user-data-storage';
import type { TodoEntry } from '@/lib/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todos = await getUserTodos(user.id);
  return NextResponse.json({ todos });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { todos?: TodoEntry[] };
  const todos = body.todos ?? [];
  const saved = await saveUserTodos(user.id, todos);

  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: todos.length });
}
