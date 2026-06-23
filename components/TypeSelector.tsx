'use client';

import {
  BookOpen,
  Coffee,
  FlaskConical,
  MapPin,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import type { ClassType } from '@/lib/types';
import { TYPE_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  MapPin,
  Wifi,
  FlaskConical,
  BookOpen,
  Coffee,
};

interface TypeSelectorProps {
  value: ClassType;
  onChange: (type: ClassType) => void;
}

const TYPES: ClassType[] = [
  'CLASS_PHYSICAL',
  'CLASS_VLE',
  'PRACTICAL',
  'STUDY',
  'REST',
];

export default function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Class type">
      {TYPES.map((type) => {
        const config = TYPE_CONFIG[type];
        const Icon = ICONS[config.icon];
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 transition-all',
              selected ? 'ring-2 ring-accent shadow-sm' : 'ring-1 ring-[var(--border)]'
            )}
            style={{
              background: selected
                ? `var(${config.bg})`
                : 'var(--bg-card)',
            }}
          >
            {Icon && (
              <Icon
                size={18}
                style={{ color: `var(${config.text})` }}
              />
            )}
            <span
              className="text-micro uppercase"
              style={{ color: `var(${config.text})` }}
            >
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
