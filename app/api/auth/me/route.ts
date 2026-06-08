import { NextResponse } from 'next/server';
import { getFreshSessionUser, getJwtSessionUser } from '@/lib/auth-user';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth-session';

export async function GET() {
  const jwtUser = await getJwtSessionUser();
  if (!jwtUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const fresh = await getFreshSessionUser();
  if (!fresh) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const response = NextResponse.json({ user: fresh });

  if (jwtUser.role !== fresh.role) {
    const token = await createSessionToken(fresh);
    response.cookies.set(sessionCookieOptions(token));
  }

  return response;
}
