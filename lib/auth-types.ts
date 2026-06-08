export type UserRole = 'admin' | 'student';
export type Cohort = 'MN 3C';

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
