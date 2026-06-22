'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { hasSeenTutorial, markTutorialSeen } from '@/lib/onboarding';
import { dispatchOnboardingComplete } from '@/lib/study-setup-events';

const STEPS = [
  {
    icon: GraduationCap,
    title: 'Welcome to Class Time',
    body: 'Built for UMaT class groups. Everyone in your class shares the same official schedule — personal routines stay private.',
  },
  {
    icon: Calendar,
    title: 'Your Timetable',
    body: 'Tap Timetable to see each day. Official classes come from your admin. The + button adds your own study blocks.',
  },
  {
    icon: BookOpen,
    title: 'My Routines',
    body: 'Under Classes → My Routines, add personal blocks that only you see. They never appear on anyone else\'s account.',
  },
  {
    icon: Video,
    title: 'Join Online Classes',
    body: 'When it\'s class time, online (VLE) cards show Join now — one tap opens Zoom.',
  },
  {
    icon: Sparkles,
    title: 'You\'re all set',
    body: 'Stay signed in on your phone. Pull down Settings → Refresh Class Schedule if the admin updates the timetable.',
  },
];

export default function OnboardingTutorial() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const isPublic = pathname === '/login' || pathname === '/offline';

  useEffect(() => {
    if (isPublic) return;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const id = data?.user?.id as string | undefined;
        if (!id || hasSeenTutorial(id)) return;
        setUserId(id);
        setOpen(true);
        setStep(0);
      })
      .catch(() => {});
  }, [isPublic, pathname]);

  const close = () => {
    if (userId) markTutorialSeen(userId);
    setOpen(false);
    dispatchOnboardingComplete();
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    close();
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="relative w-full max-w-[390px] overflow-hidden rounded-3xl bg-bg-card shadow-xl"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-base)]"
            aria-label="Skip tutorial"
          >
            <X size={18} />
          </button>

          <div
            className="px-6 pb-6 pt-10"
            style={{
              background:
                'linear-gradient(160deg, var(--accent-light) 0%, var(--bg-card) 55%)',
            }}
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-md">
              <Icon size={28} />
            </div>

            <p className="text-micro mb-2 font-semibold uppercase tracking-wider text-accent">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-display text-[1.35rem] leading-tight">{current.title}</h2>
            <p className="text-body mt-3 text-[var(--text-secondary)]">{current.body}</p>

            <div className="mt-6 flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-accent' : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-body font-semibold text-white shadow-sm"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight size={18} />}
            </button>

            {!isLast && (
              <button
                type="button"
                onClick={close}
                className="mt-3 w-full py-2 text-caption font-medium text-[var(--text-tertiary)]"
              >
                Skip tour
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
