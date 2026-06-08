import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-session';

const PUBLIC_PREFIXES = [
  '/login',
  '/offline',
  '/api/auth',
  '/api/health',
  '/_next',
  '/icons',
  '/manifest.json',
  '/fallback',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/favicon.ico') return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};
