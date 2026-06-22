import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { normalizeCourseCode, setCourseCreditOverrides } from '@/lib/course-catalog';
import { getCourseRegistry } from '@/lib/course-registry-storage';
import { isPlannerLlmConfigured } from '@/lib/planner-llm';
import { optimizeStudyPlan } from '@/lib/planner-optimize';
import { normalizeStudyProfile } from '@/lib/study-profile';
import { getSharedSchedule } from '@/lib/shared-schedule-storage';
import {
  getUserClasses,
  getUserStudyProfile,
  saveUserStudyProfile,
} from '@/lib/user-data-storage';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [storedProfile, sharedClasses, personalClasses] = await Promise.all([
      getUserStudyProfile(user.id),
      getSharedSchedule(user.cohort),
      getUserClasses(user.id),
    ]);

    const profile = normalizeStudyProfile(storedProfile);

    const registry = await getCourseRegistry(user.cohort, sharedClasses);
    const creditMap: Record<string, 1 | 2 | 3> = {};
    for (const entry of registry) {
      creditMap[normalizeCourseCode(entry.courseCode)] = entry.creditHours;
    }
    setCourseCreditOverrides(creditMap);

    const { optimization, aiWarning } = await optimizeStudyPlan(
      profile.preferences,
      profile,
      sharedClasses,
      personalClasses.filter((c) => !c.isDefault)
    );

    const updatedProfile = {
      ...profile,
      lastAiOptimization: optimization,
    };

    await saveUserStudyProfile(user.id, updatedProfile);

    return NextResponse.json({
      ok: true,
      optimization,
      aiWarning,
      aiConfigured: isPlannerLlmConfigured(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to optimize study plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
