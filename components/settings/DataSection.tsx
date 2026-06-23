'use client';

import { useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import { clearAllTodos } from '@/lib/db';
import { syncAllClasses, clearPersonalTimetable } from '@/lib/class-sync';
import { notifyScheduleRefresh } from '@/lib/notifications';

export default function DataSection() {
  const [syncing, setSyncing] = useState(false);
  const [clearingTimetable, setClearingTimetable] = useState(false);

  const handleSyncSchedule = async () => {
    setSyncing(true);
    await syncAllClasses();
    notifyScheduleRefresh();
    setSyncing(false);
  };

  const handleClearMyTimetable = async () => {
    setClearingTimetable(true);
    try {
      await clearPersonalTimetable();
      notifyScheduleRefresh();
    } finally {
      setClearingTimetable(false);
    }
  };

  const handleClearTodos = async () => {
    await clearAllTodos();
    notifyScheduleRefresh();
  };

  return (
    <section className="mb-6">
      <p className="text-micro mb-3 uppercase text-[var(--text-tertiary)]">Data</p>
      <div className="card divide-y divide-[var(--border)]">
        <button
          type="button"
          onClick={handleSyncSchedule}
          disabled={syncing}
          className="flex w-full items-center gap-2 py-3 text-left"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin text-accent' : 'text-accent'} />
          <span className="text-body">
            {syncing ? 'Syncing…' : 'Refresh Class Schedule'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleClearMyTimetable}
          disabled={clearingTimetable}
          className="flex w-full items-center gap-2 py-3 text-left text-[var(--danger-text)] disabled:opacity-60"
        >
          <Trash2 size={16} />
          <span className="text-body">
            {clearingTimetable ? 'Clearing…' : 'Clear My Timetable'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleClearTodos}
          className="flex w-full items-center gap-2 py-3 text-left text-[var(--danger-text)]"
        >
          <Trash2 size={16} />
          <span className="text-body">Clear All Todos</span>
        </button>
      </div>
    </section>
  );
}
