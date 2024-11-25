import { NextResponse } from 'next/server';

export function middleware(req) {
  const path = req.nextUrl.pathname;
  path === '/' 
    ? fetch(new URL('/api/visitor/visit', req.url), { method: 'GET' }).catch(() => {})
    : (path.startsWith('/api/') && !/\/api\/visitor\/(req|visit|stats)/.test(path))
      ? fetch(new URL('/api/visitor/req', req.url), { method: 'GET' }).catch(() => {})
      : null;

  return NextResponse.next();
}

export const config = { matcher: ['/', '/api/:path*'] };
