import { NextResponse } from 'next/server';
import { getSessionUser, isAdmin } from '@/lib/auth-session';
import { addCustomCohort, loadCustomCohorts } from '@/lib/cohort-storage';
import { getAllCohorts } from '@/lib/cohorts';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const cohorts = await getAllCohorts();
  const custom = await loadCustomCohorts();
  return NextResponse.json({ cohorts, customCount: custom.length });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: string;
    label?: string;
    description?: string;
  };

  const id = body.id?.trim();

  if (!id) {
    return NextResponse.json({ error: 'Class code is required (e.g. EE 3B).' }, { status: 400 });
  }

  const cohortId = id;
  const cohortLabel = body.label?.trim() || cohortId;
  const cohortDescription = body.description?.trim() || 'UMaT class group';

  const existing = new Set((await getAllCohorts()).map((c) => c.id));

  try {
    const cohort = await addCustomCohort(
      { id: cohortId, label: cohortLabel, description: cohortDescription, hasSeedSchedule: false },
      existing
    );
    return NextResponse.json({
      ok: true,
      cohort,
      message: `${cohort.label} is now available on the sign-up page. Add the timetable under Admin → Class Schedule.`,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'COHORT_EXISTS') {
      return NextResponse.json({ error: 'That class group already exists.' }, { status: 409 });
    }
    if (code === 'INVALID_COHORT_ID') {
      return NextResponse.json(
        { error: 'Use a short class code like EE 3B or MN 4B (letters, numbers, spaces).' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Could not create class group.' }, { status: 500 });
  }
}
