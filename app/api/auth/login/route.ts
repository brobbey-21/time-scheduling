import { NextResponse } from 'next/server';
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-errors';
import { ensureBootstrapAdmins, findUserByEmail } from '@/lib/user-storage';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await ensureBootstrapAdmins();
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        {
          error:
            'Invalid email or password. If you have not signed up on this site yet, use Create Account first.',
        },
        { status: 401 }
      );
    }

    if (user.cohort !== 'MN 3C') {
      return NextResponse.json(
        { error: 'This app is only for MN 3C students.' },
        { status: 403 }
      );
    }

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
    return authErrorResponse(err, 'login');
  }
}
