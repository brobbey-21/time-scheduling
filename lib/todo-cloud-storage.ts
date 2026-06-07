import type { TodoEntry } from './types';
import { isUpstashConfigured, upstashCommand } from './upstash';

const REDIS_KEY = 'isaac:todos';

export async function getCloudTodos(): Promise<TodoEntry[] | null> {
  if (!isUpstashConfigured()) return null;

  const result = (await upstashCommand(['GET', REDIS_KEY])) as {
    result?: string | null;
  } | null;

  if (!result?.result) return [];
  try {
    const parsed = JSON.parse(result.result) as TodoEntry[] | { todos?: TodoEntry[] };
    if (Array.isArray(parsed)) return parsed;
    return parsed.todos ?? [];
  } catch {
    return [];
  }
}

export async function saveCloudTodos(todos: TodoEntry[]): Promise<boolean> {
  if (!isUpstashConfigured()) return false;
  const result = await upstashCommand(['SET', REDIS_KEY, JSON.stringify(todos)]);
  return result !== null;
}
