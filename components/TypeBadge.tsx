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

interface TypeBadgeProps {
  type: ClassType;
  pulse?: boolean;
  className?: string;
}

export default function TypeBadge({ type, pulse, className }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  const Icon = ICONS[config.icon];

  return (
    <span
      className={cn('type-badge', pulse && 'type-badge-pulse', className)}
      data-type={type}
    >
      {Icon && <Icon size={11} />}
      {config.label}
    </span>
  );
}
