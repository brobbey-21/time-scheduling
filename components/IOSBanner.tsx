'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function IOSBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('ios-banner-dismissed');
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl bg-[var(--accent-light)] p-4">
      <p className="text-caption flex-1 text-[var(--text-primary)]">
        Tap Share → Add to Home Screen for notifications.
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem('ios-banner-dismissed', 'true');
          setVisible(false);
        }}
        className="shrink-0 text-[var(--text-tertiary)]"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
