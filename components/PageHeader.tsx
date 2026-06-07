'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  left,
  right,
  children,
}: PageHeaderProps) {
  if (children) {
    return <header className="mb-6">{children}</header>;
  }

  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {left}
        {title && <h1 className="text-display">{title}</h1>}
        {subtitle && (
          <p className="text-caption mt-1 text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
