export type ClassType =
  | 'CLASS_PHYSICAL'
  | 'CLASS_VLE'
  | 'PRACTICAL'
  | 'STUDY'
  | 'REST';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface ClassEntry {
  id: string;
  courseCode: string;
  courseName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  venue: string;
  lecturer: string;
  type: ClassType;
  notificationEnabled: boolean;
  notificationMinsBefore: number;
  notes: string;
  meetingUrl?: string;
  isDefault: boolean;
  plannerGenerated?: boolean;
  plannerVersion?: number;
  createdAt: number;
  updatedAt: number;
}

export interface StudyPreferences {
  dailyBudgetMinutes: number;
  wakeTime: string;
  sleepTime: string;
  planWeekends: boolean;
  breakMinutes: number;
  minStudyBlockMinutes: number;
  maxStudyBlockMinutes: number;
  setupCompletedAt?: number;
  lastGeneratedAt?: number;
  plannerVersion: number;
}

export type PlannerFeedbackType =
  | 'deleted'
  | 'edited'
  | 'regenerated_day'
  | 'regenerated_week'
  | 'setup_completed';

export interface PlannerFeedbackEvent {
  at: number;
  type: PlannerFeedbackType;
  day?: DayOfWeek;
  blockId?: string;
  details?: string;
}

export interface StudyProfile {
  preferences: StudyPreferences;
  feedback: PlannerFeedbackEvent[];
}

export interface TodoEntry {
  id: string;
  date: string;
  text: string;
  completed: boolean;
  starred: boolean;
  reminderTime?: string;
  order: number;
  createdAt: number;
  updatedAt?: number;
}

export interface SettingEntry {
  key: string;
  value: string | number | boolean;
}

export const TYPE_CONFIG: Record<
  ClassType,
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    cardTint: string;
  }
> = {
  CLASS_PHYSICAL: {
    label: 'CLASS',
    icon: 'MapPin',
    bg: '--type-physical-bg',
    text: '--type-physical-text',
    cardTint: '--tint-physical',
  },
  CLASS_VLE: {
    label: 'ONLINE',
    icon: 'Wifi',
    bg: '--type-vle-bg',
    text: '--type-vle-text',
    cardTint: '--tint-vle',
  },
  PRACTICAL: {
    label: 'PRACTICAL',
    icon: 'FlaskConical',
    bg: '--type-practical-bg',
    text: '--type-practical-text',
    cardTint: '--tint-practical',
  },
  STUDY: {
    label: 'STUDY',
    icon: 'BookOpen',
    bg: '--type-study-bg',
    text: '--type-study-text',
    cardTint: '--tint-study',
  },
  REST: {
    label: 'REST',
    icon: 'Coffee',
    bg: '--type-rest-bg',
    text: '--type-rest-text',
    cardTint: '--tint-rest',
  },
};

export const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export const TYPE_LABELS: Record<ClassType, string> = {
  CLASS_PHYSICAL: 'Class (Physical)',
  CLASS_VLE: 'Online (VLE)',
  PRACTICAL: 'Practical',
  STUDY: 'Study Block',
  REST: 'Rest',
};
