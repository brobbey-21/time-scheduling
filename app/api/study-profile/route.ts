import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import {
  appendFeedback,
  createDefaultStudyProfile,
  normalizeStudyProfile,
} from '@/lib/study-profile';
import {
  getUserStudyProfile,
  saveUserStudyProfile,
} from '@/lib/user-data-storage';
import type { PlannerFeedbackEvent, StudyPreferences } from '@/lib/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stored = await getUserStudyProfile(user.id);
  const profile = normalizeStudyProfile(stored);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    preferences?: Partial<StudyPreferences>;
    feedback?: Omit<PlannerFeedbackEvent, 'at'>[];
  };

  const stored = await getUserStudyProfile(user.id);
  let profile = stored ? normalizeStudyProfile(stored) : createDefaultStudyProfile();

  if (body.preferences) {
    profile = {
      ...profile,
      preferences: {
        ...profile.preferences,
        ...body.preferences,
      },
    };
  }

  if (body.feedback?.length) {
    for (const event of body.feedback) {
      profile = appendFeedback(profile, event);
    }
  }

  const saved = await saveUserStudyProfile(user.id, profile);
  if (!saved) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile });
}
