import type { ClassEntry } from './types';

export function isSharedClass(cls: ClassEntry): boolean {
  return cls.isDefault;
}

export function isPersonalClass(cls: ClassEntry): boolean {
  return !cls.isDefault;
}

export function getSharedClasses(classes: ClassEntry[]): ClassEntry[] {
  return classes.filter(isSharedClass);
}

export function getPersonalClasses(classes: ClassEntry[]): ClassEntry[] {
  return classes.filter(isPersonalClass);
}

export function composeSchedule(
  shared: ClassEntry[],
  personal: ClassEntry[]
): ClassEntry[] {
  return [...shared, ...personal];
}
