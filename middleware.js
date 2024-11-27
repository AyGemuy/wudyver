import { NextResponse } from 'next/server';
import Cookies from 'js-cookie';

const VISITOR_API_URL = '/api/visitor';
const RATE_LIMIT = 60;
const RATE_LIMIT_KEY = 'visitorRateLimit';

export async function middleware(req) {
  const { nextUrl: { pathname, origin }, ip } = req;
  const loggedUserEmail = Cookies.get('loggedUserEmail');
  const visitApi = `${origin}${VISITOR_API_URL}`;

  // Jika tidak login dan bukan di halaman login/sign-up, redirect ke sign-in
  if (!loggedUserEmail && pathname !== '/' && !pathname.startsWith('/api') && !pathname.startsWith('/authentication')) {
    return NextResponse.redirect(`${origin}/authentication/sign-in`);
  }

  // Jika sudah login dan sedang mencoba mengakses halaman login/sign-up, redirect ke /docs
  if (loggedUserEmail && (pathname === '/authentication/sign-in' || pathname === '/authentication/sign-up')) {
    return NextResponse.redirect(`${origin}/docs`);
  }

  try {
    // Hanya lakukan penghitungan pengunjung untuk halaman /
    if (pathname === '/') {
      await fetch(`${visitApi}/visit`);
    } else if (/^\/api\/(?!visitor\/(req|visit|stats)).*/.test(pathname)) {
      await fetch(`${visitApi}/req`);
    }

    // Pembatasan laju untuk api selain /api/visitor
    if (pathname.startsWith('/api') && !pathname.startsWith('/api/visitor')) {
      const rateLimitKey = `${RATE_LIMIT_KEY}:${ip}`;
      const rateLimitCount = parseInt(Cookies.get(rateLimitKey) || '0', 10);

      if (rateLimitCount >= RATE_LIMIT) {
        return NextResponse.error({ status: 429, statusText: 'Too Many Requests' });
      }

      Cookies.set(rateLimitKey, rateLimitCount + 1, { expires: 1 / 24, path: '/' });
    }

  } catch (error) {
    return NextResponse.error({ status: 500, statusText: 'Internal Server Error' });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/', 
    '/api/:path*', 
    '/authentication/sign-in', 
    '/authentication/sign-up', 
    '/authentication/:path*'
  ],
};
