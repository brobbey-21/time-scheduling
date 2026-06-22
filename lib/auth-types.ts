export type UserRole = 'admin' | 'student';
/** Class group id — see lib/cohorts.ts */
export type Cohort = string;

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  cohort: Cohort;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cohort: Cohort;
}

export interface UserMeta {
  seeded: boolean;
  updatedAt: number;
}
