import type {
  PlannerFeedbackEvent,
  StudyPreferences,
  StudyProfile,
} from './types';
import { formatTime12, timeToMinutes } from './utils';

export const PLANNER_VERSION = 2;

const MINUTES_PER_DAY = 24 * 60;
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

/** Sleep clock time is earlier than wake — bedtime is the next morning. */
export function isOvernightSleep(wakeTime: string, sleepTime: string): boolean {
  return timeToMinutes(sleepTime) < timeToMinutes(wakeTime);
}

export function isValidWakeSleep(wakeTime: string, sleepTime: string): boolean {
  return timeToMinutes(wakeTime) !== timeToMinutes(sleepTime);
}

/** @deprecated Use isValidWakeSleep */
export function isSleepAfterWake(wakeTime: string, sleepTime: string): boolean {
  return isValidWakeSleep(wakeTime, sleepTime);
}

export interface ActivityWindow {
  start: number;
  end: number;
}

/** Awake windows within one calendar day (supports past-midnight sleep). */
export function getActivityWindows(
  wakeTime: string,
  sleepTime: string
): ActivityWindow[] {
  const wake = timeToMinutes(wakeTime);
  const sleep = timeToMinutes(sleepTime);
  if (wake === sleep) return [];

  if (sleep > wake) {
    return [{ start: wake, end: sleep }];
  }

  return [
    { start: wake, end: MINUTES_PER_DAY },
    { start: 0, end: sleep },
  ];
}

export function formatSleepScheduleLabel(
  wakeTime: string,
  sleepTime: string
): string {
  if (isOvernightSleep(wakeTime, sleepTime)) {
    return `Awake from ${formatTime12(wakeTime)} until ${formatTime12(sleepTime)} next morning`;
  }
  return `Awake ${formatTime12(wakeTime)} – ${formatTime12(sleepTime)}`;
}
