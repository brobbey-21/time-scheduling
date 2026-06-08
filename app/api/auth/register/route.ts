import { NextResponse } from 'next/server';
import {
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
} from '@/lib/auth';
import { createUser } from '@/lib/user-storage';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      isMn3cStudent?: boolean;
    };

    const email = body.email?.trim();
    const password = body.password ?? '';
    const name = body.name?.trim();

    if (!email || !name || password.length < 6) {
      return NextResponse.json(
        { error: 'Name, email, and password (6+ chars) are required' },
        { status: 400 }
      );
    }

    if (!body.isMn3cStudent) {
      return NextResponse.json(
        { error: 'This app is only for MN 3C students. Confirm you are in MN 3C to continue.' },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, name, passwordHash, 'MN 3C');

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
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
