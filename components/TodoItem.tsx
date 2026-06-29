'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, MoreHorizontal, Repeat, Star, Trash2 } from 'lucide-react';
import type { TodoEntry } from '@/lib/types';
import { DAY_SHORT } from '@/lib/types';
import { formatTime12 } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TodoItemProps {
  todo: TodoEntry;
  onToggle: (id: string) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onSetReminder?: (id: string, reminderTime: string | undefined) => void;
}

const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onStar,
  onDelete,
  onSetReminder,
}: TodoItemProps) {
  const [editingReminder, setEditingReminder] = useState(false);
  const [time, setTime] = useState(todo.reminderTime ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const saveReminder = () => {
    onSetReminder?.(todo.id, time || undefined);
    setEditingReminder(false);
  };

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    if (confirm('Delete this task?')) {
      onDelete(todo.id);
    }
  }, [onDelete, todo.id]);

  const handleReminderToggle = useCallback(() => {
    setMenuOpen(false);
    if (todo.reminderTime) {
      onSetReminder?.(todo.id, undefined);
    } else {
      setTime(todo.reminderTime ?? '');
      setEditingReminder(true);
    }
  }, [onSetReminder, todo.id, todo.reminderTime]);

  const handleStarToggle = useCallback(() => {
    setMenuOpen(false);
    onStar(todo.id);
  }, [onStar, todo.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
        {todo.recurring && todo.recurringDays && todo.recurringDays.length > 0 && (
          <p className="text-caption mt-0.5 flex items-center gap-1 text-[var(--text-tertiary)]">
            <Repeat size={11} />
            {todo.recurringDays.map((d) => DAY_SHORT[d]).join(', ')}
          </p>
        )}
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <div className="flex items-center gap-1">
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
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 text-[var(--text-tertiary)]"
            aria-label="More options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-bg-card shadow-lg"
            >
              {onSetReminder && !todo.completed && (
                <button
                  type="button"
                  onClick={handleReminderToggle}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-caption hover:bg-[var(--bg-base)]"
                >
                  {todo.reminderTime ? (
                    <>
                      <BellOff size={14} className="text-[var(--text-secondary)]" />
                      <span>Remove reminder</span>
                    </>
                  ) : (
                    <>
                      <Bell size={14} className="text-[var(--text-secondary)]" />
                      <span>Set reminder</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleStarToggle}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-caption hover:bg-[var(--bg-base)]"
              >
                <Star
                  size={14}
                  className={cn(
                    todo.starred
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-[var(--text-secondary)]'
                  )}
                />
                <span>{todo.starred ? 'Unstar' : 'Star task'}</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-caption text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default TodoItem;
