export interface CohortDefinition {
  id: string;
  label: string;
  description: string;
  /** Pre-fill official timetable (MN 3C only). */
  hasSeedSchedule: boolean;
}

const MN_3C: CohortDefinition = {
  id: 'MN 3C',
  label: 'MN 3C',
  description: 'Mining Engineering — Year 3',
  hasSeedSchedule: true,
};

const DEFAULT_EXTRA_COHORTS: CohortDefinition[] = [
  {
    id: 'MN 2A',
    label: 'MN 2A',
    description: 'Mining Engineering — Year 2',
    hasSeedSchedule: false,
  },
  {
    id: 'MN 2B',
    label: 'MN 2B',
    description: 'Mining Engineering — Year 2',
    hasSeedSchedule: false,
  },
  {
    id: 'MN 4A',
    label: 'MN 4A',
    description: 'Mining Engineering — Year 4',
    hasSeedSchedule: false,
  },
  {
    id: 'CS 3A',
    label: 'CS 3A',
    description: 'Computer Science — Year 3',
    hasSeedSchedule: false,
  },
  {
    id: 'EE 3A',
    label: 'EE 3A',
    description: 'Electrical Engineering — Year 3',
    hasSeedSchedule: false,
  },
];

function parseEnvCohorts(): CohortDefinition[] {
  const raw = process.env.ADDITIONAL_COHORTS?.trim();
  if (!raw) return [];

  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((id) => ({
      id,
      label: id,
      description: 'UMaT class group',
      hasSeedSchedule: false,
    }));
}

export function getCohorts(): CohortDefinition[] {
  const seen = new Set<string>();
  const merged: CohortDefinition[] = [];

  for (const cohort of [MN_3C, ...DEFAULT_EXTRA_COHORTS, ...parseEnvCohorts()]) {
    if (seen.has(cohort.id)) continue;
    seen.add(cohort.id);
    merged.push(cohort);
  }

  return merged;
}

export function isValidCohort(cohort: string): boolean {
  return getCohorts().some((c) => c.id === cohort);
}

export function getCohortLabel(cohort: string): string {
  return getCohorts().find((c) => c.id === cohort)?.label ?? cohort;
}

export function cohortHasSeedSchedule(cohort: string): boolean {
  return getCohorts().find((c) => c.id === cohort)?.hasSeedSchedule ?? false;
}

export function cohortStorageSlug(cohort: string): string {
  return cohort.toLowerCase().replace(/\s+/g, '-');
}
