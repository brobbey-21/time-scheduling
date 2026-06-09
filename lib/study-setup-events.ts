export const ONBOARDING_COMPLETE_EVENT = 'class-time-onboarding-complete';
export const OPEN_STUDY_SETUP_EVENT = 'class-time-open-study-setup';

export function dispatchOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_COMPLETE_EVENT));
}

export function dispatchOpenStudySetup(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_STUDY_SETUP_EVENT));
}
