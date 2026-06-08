import { NextResponse } from 'next/server';
import { getFreshSessionUser } from '@/lib/auth-user';
import { createSessionToken, isAdmin, sessionCookieOptions } from '@/lib/auth-session';
import { updateUserRole } from '@/lib/user-storage';
import type { UserRole } from '@/lib/auth-types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getFreshSessionUser();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = (await request.json()) as { role?: UserRole };
  if (body.role !== 'admin' && body.role !== 'student') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const updated = await updateUserRole(params.id, body.role);
    const response = NextResponse.json({ user: updated });

    if (actor.id === updated.id) {
      const token = await createSessionToken({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        cohort: updated.cohort,
      });
      response.cookies.set(sessionCookieOptions(token));
    }

    return response;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (err.message === 'CANNOT_DEMOTE_OWNER') {
        return NextResponse.json(
          { error: 'The primary owner account cannot be demoted.' },
          { status: 403 }
        );
      }
      if (err.message === 'LAST_ADMIN') {
        return NextResponse.json(
          { error: 'At least one admin must remain on the platform.' },
          { status: 403 }
        );
      }
    }
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
