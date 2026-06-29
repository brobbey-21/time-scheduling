import { NextResponse } from 'next/server';
import { getFreshSessionUser } from '@/lib/auth-user';
import { createSessionToken, isAdmin, sessionCookieOptions } from '@/lib/auth-session';
import { canManageUser, isSuperAdmin } from '@/lib/auth-permissions';
import { findUserById, updateUserRole, updateUserCohort } from '@/lib/user-storage';
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

  const body = (await request.json()) as { role?: UserRole; cohort?: string };

  const target = await findUserById(params.id);
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!canManageUser(actor, target)) {
    return NextResponse.json(
      { error: 'You can only manage members in your own class.' },
      { status: 403 }
    );
  }

  try {
    let updated;
    if (body.cohort !== undefined) {
      updated = await updateUserCohort(params.id, body.cohort, {
        cohort: actor.cohort,
        email: actor.email,
        isSuperAdmin: isSuperAdmin(actor),
      });
    } else if (body.role !== undefined) {
      if (body.role !== 'admin' && body.role !== 'student') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updated = await updateUserRole(params.id, body.role, {
        cohort: actor.cohort,
        email: actor.email,
        isSuperAdmin: isSuperAdmin(actor),
      });
    } else {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

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
      if (err.message === 'LAST_COHORT_ADMIN') {
        return NextResponse.json(
          { error: 'Each class needs at least one admin. Promote someone else first.' },
          { status: 403 }
        );
      }
      if (err.message === 'COHORT_FORBIDDEN') {
        return NextResponse.json(
          { error: 'You can only manage members in your own class.' },
          { status: 403 }
        );
      }
      if (err.message === 'CANNOT_MIGRATE_OWNER') {
        return NextResponse.json(
          { error: 'The primary owner account cannot be moved.' },
          { status: 403 }
        );
      }
      if (err.message === 'ALREADY_IN_COHORT') {
        return NextResponse.json(
          { error: 'User is already in that class.' },
          { status: 400 }
        );
      }
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
