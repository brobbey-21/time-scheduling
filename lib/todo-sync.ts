import { getAllTodos, replaceAllTodos } from './db';
import { notifyScheduleRefresh } from './notifications';
import type { TodoEntry } from './types';

function todoTimestamp(todo: TodoEntry): number {
  return todo.updatedAt ?? todo.createdAt;
}

export function mergeTodos(local: TodoEntry[], remote: TodoEntry[]): TodoEntry[] {
  const map = new Map<string, TodoEntry>();

  for (const todo of local) {
    map.set(todo.id, todo);
  }

  for (const todo of remote) {
    const existing = map.get(todo.id);
    if (!existing || todoTimestamp(todo) >= todoTimestamp(existing)) {
      map.set(todo.id, todo);
    }
  }

  return Array.from(map.values());
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulling = false;

export function notifyTodosChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('todos-changed'));
}

export async function pushTodos(todos?: TodoEntry[]): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;

  try {
    const payload = todos ?? (await getAllTodos());
    const res = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos: payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function scheduleTodoPush(): void {
  if (typeof window === 'undefined') return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushTodos();
  }, 400);
}

export async function pullTodos(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine || pulling) return false;

  pulling = true;
  try {
    const res = await fetch('/api/todos', { cache: 'no-store' });
    if (res.status === 401 || res.status === 503) return false;
    if (!res.ok) return false;

    const data = (await res.json()) as { todos?: TodoEntry[] };
    const remote = data.todos ?? [];
    const local = await getAllTodos();
    const merged = mergeTodos(local, remote);

    await replaceAllTodos(merged);
    await pushTodos(merged);
    notifyTodosChanged();
    notifyScheduleRefresh();
    return true;
  } catch {
    return false;
  } finally {
    pulling = false;
  }
}
