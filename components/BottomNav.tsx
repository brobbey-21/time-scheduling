'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CheckSquare, Home, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/timetable', label: 'Timetable', icon: Calendar },
  { href: '/todos', label: 'Todos', icon: CheckSquare },
  { href: '/manage?tab=routines', label: 'Routines', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/offline') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-bg-card">
      <div
        className="mx-auto flex max-w-[430px] items-center justify-around px-2 pt-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : href.startsWith('/manage')
                ? pathname.startsWith('/manage')
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors',
                active ? 'text-accent' : 'text-[var(--text-tertiary)]'
              )}
            >
              {active && (
                <span className="mb-0.5 h-1 w-1 rounded-full bg-accent" />
              )}
              {!active && <span className="mb-0.5 h-1 w-1" />}
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-micro">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
