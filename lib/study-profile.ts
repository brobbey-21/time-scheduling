import type {
  PlannerFeedbackEvent,
  StudyPreferences,
  StudyProfile,
} from './types';

export const PLANNER_VERSION = 1;
export const MAX_FEEDBACK_EVENTS = 100;

export const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  dailyBudgetMinutes: 360,
  wakeTime: '06:00',
  sleepTime: '23:00',
  planWeekends: false,
  breakMinutes: 15,
  minStudyBlockMinutes: 45,
  maxStudyBlockMinutes: 90,
  plannerVersion: PLANNER_VERSION,
};

export function createDefaultStudyProfile(): StudyProfile {
  return {
    preferences: { ...DEFAULT_STUDY_PREFERENCES },
    feedback: [],
  };
}

export function normalizeStudyProfile(raw: StudyProfile | null): StudyProfile {
  if (!raw?.preferences) return createDefaultStudyProfile();
  return {
    preferences: {
      ...DEFAULT_STUDY_PREFERENCES,
      ...raw.preferences,
      plannerVersion: raw.preferences.plannerVersion ?? PLANNER_VERSION,
    },
    feedback: Array.isArray(raw.feedback) ? raw.feedback : [],
  };
}

export function appendFeedback(
  profile: StudyProfile,
  event: Omit<PlannerFeedbackEvent, 'at'> & { at?: number }
): StudyProfile {
  const entry: PlannerFeedbackEvent = {
    ...event,
    at: event.at ?? Date.now(),
  };
  const feedback = [...profile.feedback, entry].slice(-MAX_FEEDBACK_EVENTS);
  return { ...profile, feedback };
}

export function isSleepAfterWake(wakeTime: string, sleepTime: string): boolean {
  const [wh, wm] = wakeTime.split(':').map(Number);
  const [sh, sm] = sleepTime.split(':').map(Number);
  return sh * 60 + sm > wh * 60 + wm;
}
