import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { ClassEntry, DayOfWeek, SettingEntry, TodoEntry } from './types';
import { DAYS } from './types';
import { dedupeScheduleClasses } from './schedule-dedupe';

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
  return dedupeScheduleClasses(classes);
}

export async function getClassById(id: string): Promise<ClassEntry | undefined> {
  const db = await getDB();
  return db.get('classes', id);
}

function scheduleClassCloudPush(): void {
  if (typeof window !== 'undefined') {
    import('./class-sync').then(({ scheduleClassPush, notifyClassesChanged }) => {
      scheduleClassPush();
      notifyClassesChanged();
    });
  }
}

export async function replaceAllClasses(classes: ClassEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('classes', 'readwrite');
  await tx.store.clear();
  for (const cls of classes) {
    await tx.store.put(cls);
  }
  await tx.done;
}

export async function addClass(
  entry: Omit<ClassEntry, 'createdAt' | 'updatedAt'>
): Promise<ClassEntry> {
  const db = await getDB();
  const now = Date.now();
  const full: ClassEntry = { ...entry, createdAt: now, updatedAt: now };
  await db.put('classes', full);
  scheduleClassCloudPush();
  return full;
}

function logPlannerFeedback(
  existing: ClassEntry,
  type: 'deleted' | 'edited',
  details?: string
): void {
  if (!existing.plannerGenerated || typeof window === 'undefined') return;
  import('./study-profile-sync').then(({ queuePlannerFeedback }) => {
    queuePlannerFeedback({
      type,
      day: existing.day,
      blockId: existing.id,
      details,
    });
  });
}

export async function updateClass(
  id: string,
  updates: Partial<ClassEntry>
): Promise<ClassEntry | undefined> {
  const db = await getDB();
  const existing = await db.get('classes', id);
  if (!existing) return undefined;
  if (existing.isDefault) return undefined;
  const updated: ClassEntry = { ...existing, ...updates, updatedAt: Date.now() };
  if (
    existing.plannerGenerated &&
    (updates.startTime !== undefined || updates.endTime !== undefined) &&
    (updates.startTime !== existing.startTime || updates.endTime !== existing.endTime)
  ) {
    logPlannerFeedback(
      existing,
      'edited',
      `${existing.startTime}-${existing.endTime}→${updated.startTime}-${updated.endTime}`
    );
  }
  await db.put('classes', updated);
  scheduleClassCloudPush();
  return updated;
}

export async function deleteClass(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('classes', id);
  if (!existing || existing.isDefault) return false;
  logPlannerFeedback(existing, 'deleted');
  await db.delete('classes', id);
  scheduleClassCloudPush();
  return true;
}

export async function deleteClasses(ids: string[]): Promise<void> {
  const db = await getDB();
  const deletable: string[] = [];
  for (const id of ids) {
    const existing = await db.get('classes', id);
    if (existing && !existing.isDefault) deletable.push(id);
  }
  if (deletable.length === 0) return;
  for (const id of deletable) {
    const existing = await db.get('classes', id);
    if (existing) logPlannerFeedback(existing, 'deleted');
  }
  const tx = db.transaction('classes', 'readwrite');
  await Promise.all([...deletable.map((id) => tx.store.delete(id)), tx.done]);
  scheduleClassCloudPush();
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
  scheduleClassCloudPush();
}

function getDateDayOfWeek(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T12:00:00');
  return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

export async function getTodosByDate(date: string): Promise<TodoEntry[]> {
  const db = await getDB();
  const direct = await db.getAllFromIndex('todos', 'by-date', date);
  const dayOfWeek = getDateDayOfWeek(date);
  const allTodos = await db.getAll('todos');
  const recurring = allTodos
    .filter(
      (t) =>
        t.recurring &&
        t.recurringDays?.includes(dayOfWeek) &&
        t.date !== date
    )
    .map((t) => ({
      ...t,
      completed: t.completedDates?.includes(date) ?? false,
    }));
  const combined = [...direct, ...recurring];
  return combined.sort((a, b) => a.order - b.order);
}

export async function getAllTodos(): Promise<TodoEntry[]> {
  const db = await getDB();
  return db.getAll('todos');
}

export async function replaceAllTodos(todos: TodoEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('todos', 'readwrite');
  await tx.store.clear();
  for (const todo of todos) {
    await tx.store.put(todo);
  }
  await tx.done;
}

function scheduleTodoCloudPush(): void {
  if (typeof window !== 'undefined') {
    import('./todo-sync').then(({ scheduleTodoPush, notifyTodosChanged }) => {
      scheduleTodoPush();
      notifyTodosChanged();
    });
  }
}

export async function addTodo(
  entry: Omit<TodoEntry, 'id' | 'createdAt' | 'order'> & { order?: number }
): Promise<TodoEntry> {
  const db = await getDB();
  const existing = await getTodosByDate(entry.date);
  const now = Date.now();
  const todo: TodoEntry = {
    ...entry,
    id: uuidv4(),
    order: entry.order ?? existing.length,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('todos', todo);
  scheduleTodoCloudPush();
  return todo;
}

export async function updateTodo(
  id: string,
  updates: Partial<TodoEntry>
): Promise<TodoEntry | undefined> {
  const db = await getDB();
  const existing = await db.get('todos', id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updatedAt: Date.now() };
  await db.put('todos', updated);
  scheduleTodoCloudPush();
  return updated;
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('todos', id);
  scheduleTodoCloudPush();
}

export async function clearAllTodos(): Promise<void> {
  const db = await getDB();
  await db.clear('todos');
  scheduleTodoCloudPush();
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
  scheduleClassCloudPush();
}
