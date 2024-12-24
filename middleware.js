import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: ['/', '/api/:path*', '/authentication/:path*'],
}

export async function middleware(req) {
  const { pathname, origin } = req.nextUrl
  const token = await getToken({ req, secret: process.env.JWT_SECRET })

  if (!token && !pathname.startsWith('/api') && !pathname.startsWith('/authentication')) {
    return NextResponse.redirect(`${origin}/authentication/sign-in`)
  }

  const apiPaths = ['/api/visitor', '/api/user', '/api/general']
  if (pathname.startsWith('/api') && !apiPaths.some(path => pathname.startsWith(path))) {
    await fetch(`${origin}/api/visitor/req`, { method: 'GET' }).catch(() => {})
  } else if (!pathname.startsWith('/api') && !pathname.startsWith('/authentication')) {
    await fetch(`${origin}/api/visitor/visit`, { method: 'GET' }).catch(() => {})
  }

  return NextResponse.next()
}
