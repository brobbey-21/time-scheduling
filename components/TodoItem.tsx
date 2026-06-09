'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, MoreHorizontal, Star } from 'lucide-react';
import type { TodoEntry } from '@/lib/types';
import { formatTime12 } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TodoItemProps {
  todo: TodoEntry;
  onToggle: (id: string) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onSetReminder?: (id: string, reminderTime: string | undefined) => void;
}

export default function TodoItem({
  todo,
  onToggle,
  onStar,
  onDelete,
  onSetReminder,
}: TodoItemProps) {
  const [editingReminder, setEditingReminder] = useState(false);
  const [time, setTime] = useState(todo.reminderTime ?? '');

  const saveReminder = () => {
    onSetReminder?.(todo.id, time || undefined);
    setEditingReminder(false);
  };

  return (
    <div className="card flex items-start gap-3">
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          todo.completed
            ? 'border-accent bg-accent'
            : 'border-[var(--border)] bg-[var(--bg-card)]'
        )}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <motion.p
          className={cn(
            'text-body',
            todo.completed && 'text-[var(--text-tertiary)]'
          )}
          animate={{ opacity: todo.completed ? 0.6 : 1 }}
        >
          <motion.span
            animate={{
              textDecoration: todo.completed ? 'line-through' : 'none',
            }}
          >
            {todo.text}
          </motion.span>
        </motion.p>
        {editingReminder ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-caption rounded-lg border border-[var(--border)] bg-bg-base px-2 py-1"
            />
            <button
              type="button"
              onClick={saveReminder}
              className="text-caption font-semibold text-accent"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingReminder(false)}
              className="text-caption text-[var(--text-tertiary)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          todo.reminderTime && (
            <p className="text-caption mt-0.5 text-[var(--text-tertiary)]">
              Reminder · {formatTime12(todo.reminderTime)}
            </p>
          )
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onSetReminder && !todo.completed && (
          <button
            type="button"
            onClick={() => {
              if (todo.reminderTime && !editingReminder) {
                onSetReminder(todo.id, undefined);
                return;
              }
              setTime(todo.reminderTime ?? '');
              setEditingReminder(true);
            }}
            className="p-1"
            aria-label={todo.reminderTime ? 'Remove reminder' : 'Set reminder'}
          >
            {todo.reminderTime ? (
              <Bell size={16} className="text-accent" />
            ) : (
              <BellOff size={16} className="text-[var(--text-tertiary)]" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onStar(todo.id)}
          className="p-1"
          aria-label={todo.starred ? 'Unstar' : 'Star'}
        >
          <Star
            size={16}
            className={cn(
              todo.starred
                ? 'fill-amber-400 text-amber-400'
                : 'text-[var(--text-tertiary)]'
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          className="p-1 text-[var(--text-tertiary)]"
          aria-label="Delete todo"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
