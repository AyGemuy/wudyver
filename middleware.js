import { NextResponse } from 'next/server';

const VISITOR_API_URL = '/api/visitor';
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const rateLimitStore = new Map();

export async function middleware(req) {
  const { nextUrl: { pathname, origin }, ip } = req;
  const currentUser = req.cookies.currentUser;
  const publicPages = ['/authentication/sign-in', '/authentication/sign-up', '/authentication/forget-password'];

  if (!publicPages.includes(pathname) && !currentUser && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(`${origin}/authentication/sign-in`);
  }

  if (publicPages.includes(pathname) && currentUser) {
    return NextResponse.redirect(`${origin}/home`);
  }

  if (pathname === '/home' && !pathname.startsWith('/api/')) {
    try {
      await fetch(`${origin}${VISITOR_API_URL}/visit`);
    } catch (error) {}
  }

  if (/^\/api(?!\/visitor(\/(req|visit|stats))?$)(?!\/(general|user)\/stats).*/.test(pathname)) {
    const currentTime = Date.now();
    const rateLimitKey = `${ip}:${pathname}`;
    const rateData = rateLimitStore.get(rateLimitKey) || { count: 0, startTime: currentTime };

    if (currentTime - rateData.startTime > RATE_LIMIT_WINDOW) {
      rateData.count = 0;
      rateData.startTime = currentTime;
    }

    rateData.count += 1;

    if (rateData.count > RATE_LIMIT) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    rateLimitStore.set(rateLimitKey, rateData);

    try {
      await fetch(`${origin}${VISITOR_API_URL}/req`);
    } catch (error) {}
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/home', '/api/:path*', '/authentication/:path*'],
};
