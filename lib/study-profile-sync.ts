import {
  appendFeedback,
  clearPlannerProfile,
  createDefaultStudyProfile,
  normalizeStudyProfile,
} from './study-profile';
import type { PlannerFeedbackEvent, StudyPreferences, StudyProfile } from './types';

let cachedProfile: StudyProfile | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingFeedback: Omit<PlannerFeedbackEvent, 'at'>[] = [];

export function getCachedStudyProfile(): StudyProfile | null {
  return cachedProfile;
}

export function setCachedStudyProfile(profile: StudyProfile): void {
  cachedProfile = profile;
}

export async function fetchStudyProfile(): Promise<StudyProfile> {
  if (typeof window === 'undefined') return createDefaultStudyProfile();

  try {
    const res = await fetch('/api/study-profile', { cache: 'no-store' });
    if (!res.ok) return cachedProfile ?? createDefaultStudyProfile();
    const data = (await res.json()) as { profile?: StudyProfile };
    const profile = normalizeStudyProfile(data.profile ?? null);
    cachedProfile = profile;
    return profile;
  } catch {
    return cachedProfile ?? createDefaultStudyProfile();
  }
}

export async function clearStudyPlannerProfile(): Promise<StudyProfile | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/study-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearPlanner: true }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: StudyProfile };
    const profile = normalizeStudyProfile(data.profile ?? null);
    cachedProfile = profile;
    return profile;
  } catch {
    return null;
  }
}

export async function saveStudyPreferences(
  preferences: Partial<StudyPreferences>,
  feedback?: Omit<PlannerFeedbackEvent, 'at'>[]
): Promise<StudyProfile | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/study-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences, feedback }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: StudyProfile };
    const profile = normalizeStudyProfile(data.profile ?? null);
    cachedProfile = profile;
    return profile;
  } catch {
    return null;
  }
}

export function queuePlannerFeedback(
  event: Omit<PlannerFeedbackEvent, 'at'>
): void {
  pendingFeedback.push(event);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void flushPlannerFeedback();
  }, 600);
}

async function flushPlannerFeedback(): Promise<void> {
  if (pendingFeedback.length === 0) return;
  const batch = pendingFeedback.splice(0, pendingFeedback.length);
  let profile = cachedProfile ?? (await fetchStudyProfile());
  for (const event of batch) {
    profile = appendFeedback(profile, event);
  }
  cachedProfile = profile;
  await fetch('/api/study-profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback: batch }),
  }).catch(() => {});
}
