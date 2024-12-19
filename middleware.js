import { NextResponse } from 'next/server';

export async function middleware(req) {
  const { pathname, origin } = req.nextUrl;
  const token = req.cookies.get('auth_token');

  if (!pathname.startsWith('/api') && !pathname.startsWith('/authentication') && !token) {
    return NextResponse.redirect(`${origin}/authentication/sign-in`);
  }

  if (pathname.startsWith('/api') && !pathname.startsWith('/api/visitor')) {
    fetch(`${origin}/api/visitor/req`, { method: 'POST' }).catch(() => {});
  } else if (!pathname.startsWith('/api') && !pathname.startsWith('/authentication')) {
    fetch(`${origin}/api/visitor/visit`, { method: 'POST' }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|assets/|[\\w-]+\\.\\w+).*)',
  ],
};
