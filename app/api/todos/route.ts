import { NextResponse } from 'next/server';
import { getCloudTodos, saveCloudTodos } from '@/lib/todo-cloud-storage';
import type { TodoEntry } from '@/lib/types';
import { isUpstashConfigured } from '@/lib/upstash';

export async function GET() {
  if (!isUpstashConfigured()) {
    return NextResponse.json({ error: 'Sync not configured' }, { status: 503 });
  }

  const todos = await getCloudTodos();
  return NextResponse.json({ todos: todos ?? [] });
}

export async function PUT(request: Request) {
  if (!isUpstashConfigured()) {
    return NextResponse.json({ error: 'Sync not configured' }, { status: 503 });
  }

  const body = (await request.json()) as { todos?: TodoEntry[] };
  const todos = body.todos ?? [];
  const saved = await saveCloudTodos(todos);

  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: todos.length });
}
