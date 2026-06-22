'use client';

import { useRef, useState } from 'react';
import { FileUp, Globe, Loader2, Lock } from 'lucide-react';
import { importIcsSchedule, type IcsVisibility } from '@/lib/ics-import';
import { parseICSFile } from '@/lib/parse-ics';
import { cn } from '@/lib/utils';

interface IcsImportButtonProps {
  onImported: () => void;
  defaultVisibility?: IcsVisibility;
  allowPublic?: boolean;
  showVisibilityChoice?: boolean;
  cohortLabel?: string;
}

export default function IcsImportButton({
  onImported,
  defaultVisibility = 'private',
  allowPublic = false,
  showVisibilityChoice = false,
  cohortLabel = 'your class',
}: IcsImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visibility, setVisibility] = useState<IcsVisibility>(defaultVisibility);

  const canChoosePublic = allowPublic && showVisibilityChoice;
  const effectiveVisibility = canChoosePublic ? visibility : 'private';

  const visibilityLabel =
    effectiveVisibility === 'public'
      ? `shared ${cohortLabel} timetable (your class)`
      : 'your private routines (only you)';

  const handleFile = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseICSFile(text, {
        isDefault: effectiveVisibility === 'public',
      });
      if (parsed.length === 0) {
        setError('No weekly class events found in that file.');
        return;
      }

      const replaceNote =
        effectiveVisibility === 'public'
          ? `This fully replaces the current shared ${cohortLabel} timetable and course list for your class.`
          : 'This replaces your manual routines. Planned study blocks are kept.';

      const confirmed = confirm(
        `Import ${parsed.length} class${parsed.length === 1 ? '' : 'es'} from "${file.name}" as ${visibilityLabel}?\n\n${replaceNote}`
      );
      if (!confirmed) return;

      await importIcsSchedule(parsed, effectiveVisibility);
      onImported();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not read that calendar file.';
      setError(message.includes('Admin') ? message : 'Could not read that calendar file. Try a standard .ics export.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {canChoosePublic && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisibility('public')}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-caption font-medium transition-colors',
              visibility === 'public'
                ? 'border-accent bg-[var(--accent-light)] text-accent'
                : 'border-[var(--border)] text-[var(--text-secondary)]'
            )}
          >
            <Globe size={18} />
            Public
            <span className="text-micro font-normal opacity-80">Everyone sees it</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-caption font-medium transition-colors',
              visibility === 'private'
                ? 'border-accent bg-[var(--accent-light)] text-accent'
                : 'border-[var(--border)] text-[var(--text-secondary)]'
            )}
          >
            <Lock size={18} />
            Private
            <span className="text-micro font-normal opacity-80">Only your account</span>
          </button>
        </div>
      )}

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
        {canChoosePublic
          ? 'Export from Google Calendar or Outlook, then import as public or private.'
          : 'Export from Google Calendar or Outlook. Imports to your private routines only.'}
      </p>
    </div>
  );
}
