import { NextResponse } from 'next/server';
import { STORAGE_SETUP_MESSAGE } from './storage-config';

export function authErrorResponse(err: unknown, context: string): NextResponse {
  console.error(`[auth/${context}]`, err);

  if (err instanceof Error) {
    if (err.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    if (err.message === 'STORAGE_NOT_CONFIGURED') {
      return NextResponse.json({ error: STORAGE_SETUP_MESSAGE }, { status: 503 });
    }
    if (err.message === 'AUTH_SECRET is required in production') {
      return NextResponse.json(
        {
          error:
            'Server auth is not configured. Add AUTH_SECRET in Vercel Environment Variables and redeploy.',
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    { error: context === 'register' ? 'Registration failed' : 'Login failed' },
    { status: 500 }
  );
}
