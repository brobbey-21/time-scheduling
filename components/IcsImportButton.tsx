'use client';

import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { saveSharedSchedule } from '@/lib/admin-schedule';
import { parseICSFile } from '@/lib/parse-ics';

interface IcsImportButtonProps {
  onImported: () => void;
}

export default function IcsImportButton({ onImported }: IcsImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseICSFile(text);
      if (parsed.length === 0) {
        setError('No weekly class events found in that file.');
        return;
      }

      const confirmed = confirm(
        `Import ${parsed.length} class${parsed.length === 1 ? '' : 'es'} from "${file.name}"?\n\nThis replaces the current shared MN 3C timetable for everyone.`
      );
      if (!confirmed) return;

      const now = Date.now();
      await saveSharedSchedule(
        parsed.map((c) => ({ ...c, createdAt: now, updatedAt: now }))
      );
      onImported();
    } catch {
      setError('Could not read that calendar file. Try a standard .ics export.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/40 bg-[var(--accent-light)] py-3.5 text-body font-semibold text-accent disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <FileUp size={18} />
        )}
        {loading ? 'Importing…' : 'Import .ics timetable'}
      </button>
      {error && (
        <p className="text-caption mt-2 text-[var(--danger-text)]">{error}</p>
      )}
      <p className="text-caption mt-2 text-center text-[var(--text-tertiary)]">
        Export from Google Calendar or Outlook, then import here.
      </p>
    </div>
  );
}
