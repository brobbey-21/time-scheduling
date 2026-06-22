import { NextResponse } from 'next/server';
import {
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
} from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-errors';
import { isValidCohort } from '@/lib/cohorts';
import { createUser } from '@/lib/user-storage';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      cohort?: string;
      confirmedStudent?: boolean;
    };

    const email = body.email?.trim();
    const password = body.password ?? '';
    const name = body.name?.trim();
    const cohort = body.cohort?.trim();

    if (!email || !name || password.length < 6) {
      return NextResponse.json(
        { error: 'Name, email, and password (6+ chars) are required' },
        { status: 400 }
      );
    }

    if (!cohort || !isValidCohort(cohort)) {
      return NextResponse.json(
        { error: 'Please select a valid class group.' },
        { status: 400 }
      );
    }

    if (!body.confirmedStudent) {
      return NextResponse.json(
        { error: `Please confirm you are a student in ${cohort}.` },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, name, passwordHash, cohort);

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      cohort: user.cohort,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        cohort: user.cohort,
      },
    });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    return authErrorResponse(err, 'register');
  }
}
