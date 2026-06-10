import { NextResponse } from 'next/server';
import { getFreshSessionUser } from '@/lib/auth-user';
import { isAdmin } from '@/lib/auth-session';
import { listAllRatings, ratingSummary } from '@/lib/rating-storage';

export async function GET() {
  const user = await getFreshSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const ratings = await listAllRatings();
  return NextResponse.json({
    ratings,
    summary: ratingSummary(ratings),
  });
}
