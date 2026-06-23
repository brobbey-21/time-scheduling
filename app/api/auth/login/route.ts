import { NextResponse } from 'next/server';
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-errors';
import { rateLimitByIp } from '@/lib/rate-limit';
import { ensureBootstrapAdmins, findUserByEmail } from '@/lib/user-storage';

export async function POST(request: Request) {
  try {
    const ipLimit = rateLimitByIp(request, { maxRequests: 10, windowMs: 60_000 });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.', retryIn: Math.ceil(ipLimit.resetIn / 1000) },
        { status: 429 }
      );
    }

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
