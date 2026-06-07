import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { ClassEntry, DayOfWeek, SettingEntry, TodoEntry } from './types';

interface IsaacDB extends DBSchema {
  classes: {
    key: string;
    value: ClassEntry;
    indexes: { 'by-day': DayOfWeek };
  };
  todos: {
    key: string;
    value: TodoEntry;
    indexes: { 'by-date': string };
  };
  settings: {
    key: string;
    value: SettingEntry;
  };
}

const DB_NAME = 'isaac-pwa';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IsaacDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<IsaacDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('classes')) {
          const store = db.createObjectStore('classes', { keyPath: 'id' });
          store.createIndex('by-day', 'day');
        }
        if (!db.objectStoreNames.contains('todos')) {
          const store = db.createObjectStore('todos', { keyPath: 'id' });
          store.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getSetting<T extends string | number | boolean>(
  key: string,
  defaultValue: T
): Promise<T> {
  const db = await getDB();
  const entry = await db.get('settings', key);
  return (entry?.value as T) ?? defaultValue;
}

export async function setSetting(
  key: string,
  value: string | number | boolean
): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getAllClasses(): Promise<ClassEntry[]> {
  const db = await getDB();
  return db.getAll('classes');
}

export async function getClassesByDay(day: DayOfWeek): Promise<ClassEntry[]> {
  const db = await getDB();
  const classes = await db.getAllFromIndex('classes', 'by-day', day);
  return classes.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getClassById(id: string): Promise<ClassEntry | undefined> {
  const db = await getDB();
  return db.get('classes', id);
}

export async function addClass(
  entry: Omit<ClassEntry, 'createdAt' | 'updatedAt'>
): Promise<ClassEntry> {
  const db = await getDB();
  const now = Date.now();
  const full: ClassEntry = { ...entry, createdAt: now, updatedAt: now };
  await db.put('classes', full);
  return full;
}

export async function updateClass(
  id: string,
  updates: Partial<ClassEntry>
): Promise<ClassEntry | undefined> {
  const db = await getDB();
  const existing = await db.get('classes', id);
  if (!existing) return undefined;
  const updated: ClassEntry = { ...existing, ...updates, updatedAt: Date.now() };
  await db.put('classes', updated);
  return updated;
}

export async function deleteClass(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('classes', id);
}

export async function deleteClasses(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('classes', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

export async function resetClassesToDefault(
  defaults: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('classes', 'readwrite');
  const all = await tx.store.getAll();
  const custom = all.filter((c) => !c.isDefault);
  await tx.store.clear();
  const now = Date.now();
  for (const entry of defaults) {
    await tx.store.put({ ...entry, createdAt: now, updatedAt: now });
  }
  for (const entry of custom) {
    await tx.store.put(entry);
  }
  await tx.done;
}

export async function getTodosByDate(date: string): Promise<TodoEntry[]> {
  const db = await getDB();
  const todos = await db.getAllFromIndex('todos', 'by-date', date);
  return todos.sort((a, b) => a.order - b.order);
}

export async function addTodo(
  entry: Omit<TodoEntry, 'id' | 'createdAt' | 'order'> & { order?: number }
): Promise<TodoEntry> {
  const db = await getDB();
  const existing = await getTodosByDate(entry.date);
  const todo: TodoEntry = {
    ...entry,
    id: uuidv4(),
    order: entry.order ?? existing.length,
    createdAt: Date.now(),
  };
  await db.put('todos', todo);
  return todo;
}

export async function updateTodo(
  id: string,
  updates: Partial<TodoEntry>
): Promise<TodoEntry | undefined> {
  const db = await getDB();
  const existing = await db.get('todos', id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates };
  await db.put('todos', updated);
  return updated;
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('todos', id);
}

export async function clearAllTodos(): Promise<void> {
  const db = await getDB();
  await db.clear('todos');
}

export async function bulkPutClasses(
  entries: Omit<ClassEntry, 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  const tx = db.transaction('classes', 'readwrite');
  for (const entry of entries) {
    await tx.store.put({ ...entry, createdAt: now, updatedAt: now });
  }
  await tx.done;
}
