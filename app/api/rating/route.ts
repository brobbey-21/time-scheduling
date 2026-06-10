import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { getUserRating, saveUserRating } from '@/lib/rating-storage';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rating = await getUserRating(user.id);
  return NextResponse.json({ rating });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { stars?: number; comment?: string };
  const stars = body.stars;
  if (typeof stars !== 'number' || stars < 1 || stars > 5) {
    return NextResponse.json(
      { error: 'Rating must be between 1 and 5 stars' },
      { status: 400 }
    );
  }

  const comment =
    typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : undefined;

  const rating = await saveUserRating({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    stars,
    comment: comment || undefined,
  });

  return NextResponse.json({ ok: true, rating });
}
